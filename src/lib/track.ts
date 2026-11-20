import crypto from "node:crypto";
import { trafficSource } from "@/lib/attribution";
import { getDb } from "@/lib/db";

/** Public beacon events. Server-only events are recorded in-process, not via POST /api/track. */
export const BEACON_EVENTS = ["try_it_free_hero", "try_it_free_sticky", "try_it_free_header"] as const;
export const SERVER_EVENTS = [
  "trial_start_view",
  "trial_signup",
  "trial_checkout_created",
  "trial_checkout_completed",
] as const;
export const TRACK_EVENTS = [...BEACON_EVENTS, ...SERVER_EVENTS] as const;

export type BeaconEvent = (typeof BEACON_EVENTS)[number];
export type TrackEvent = (typeof TRACK_EVENTS)[number];

const BEACON_SET = new Set<string>(BEACON_EVENTS);
const TRACK_SET = new Set<string>(TRACK_EVENTS);

export function isBeaconEvent(value: unknown): value is BeaconEvent {
  return typeof value === "string" && BEACON_SET.has(value);
}

export function isTrackEvent(value: unknown): value is TrackEvent {
  return typeof value === "string" && TRACK_SET.has(value);
}

/** Test / bot accounts that should not appear in signup or checkout counters. */
export function isTestEmail(email: string | null | undefined) {
  if (!email) return false;
  const value = email.trim().toLowerCase();
  if (value.startsWith("trial.verify")) return true;
  const domain = value.split("@")[1] ?? "";
  return domain === "example.com" || domain === "mail.grokbot.com";
}

/** Calendar day in America/Chicago, as YYYY-MM-DD. */
export function chicagoDay(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function ensureTrackSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_counts (
      day TEXT NOT NULL,
      event TEXT NOT NULL,
      source TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, event, source)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_dedupe (
      id TEXT PRIMARY KEY
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_rate (
      key TEXT NOT NULL,
      hour TEXT NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (key, hour)
    )
  `);
}

export function incrementEvent(event: TrackEvent, source = "direct") {
  ensureTrackSchema();
  const day = chicagoDay();
  const origin = source.trim() ? source.trim().slice(0, 64) : "direct";
  getDb()
    .prepare(
      `INSERT INTO event_counts (day, event, source, count) VALUES (?, ?, ?, 1)
       ON CONFLICT(day, event, source) DO UPDATE SET count = count + 1`,
    )
    .run(day, event, origin);
}

function reserveDedupe(id: string) {
  const key = id.trim().slice(0, 200);
  if (!key) return false;
  const result = getDb().prepare("INSERT OR IGNORE INTO event_dedupe (id) VALUES (?)").run(key);
  return result.changes > 0;
}

/** Increment once for a Stripe session or event id. Returns false if already counted. */
export function incrementEventOnce(dedupeId: string, event: TrackEvent, source = "direct", aliases: string[] = []) {
  ensureTrackSchema();
  const ids = [dedupeId, ...aliases].map((value) => value.trim().slice(0, 200)).filter(Boolean);
  if (!ids.length) return false;
  // If any known id is already counted, record the rest and skip the increment.
  const already = ids.some((id) => {
    const row = getDb().prepare("SELECT 1 AS ok FROM event_dedupe WHERE id = ?").get(id);
    return Boolean(row);
  });
  for (const id of ids) reserveDedupe(id);
  if (already) return false;
  incrementEvent(event, source);
  return true;
}

export function recordTrackedEvent(event: TrackEvent, attribution: { utm_source?: unknown; ref?: unknown }) {
  incrementEvent(event, trafficSource(attribution));
}

export function recordUniqueTrackedEvent(
  dedupeId: string,
  event: TrackEvent,
  attribution: { utm_source?: unknown; ref?: unknown },
  aliases: string[] = [],
) {
  return incrementEventOnce(dedupeId, event, trafficSource(attribution), aliases);
}

/** Light hourly cap for the public beacon. Key is hashed so raw IPs are not stored. */
export function takeTrackRate(clientKey: string, limitPerHour = 60) {
  const hour = new Date().toISOString().slice(0, 13);
  const key = `track:${crypto.createHash("sha256").update(clientKey).digest("hex").slice(0, 24)}`;
  const db = getDb();
  db.prepare(
    `INSERT INTO auth_rate (key, hour, count) VALUES (?, ?, 1)
     ON CONFLICT(key, hour) DO UPDATE SET count = count + 1`,
  ).run(key, hour);
  const row = db.prepare("SELECT count FROM auth_rate WHERE key = ? AND hour = ?").get(key, hour) as { count: number };
  return row.count <= limitPerHour;
}

export type EventCountRow = { day: string; event: string; source: string; count: number };

export function eventCounts(): EventCountRow[] {
  ensureTrackSchema();
  return getDb()
    .prepare(
      `SELECT day, event, source, count FROM event_counts
       ORDER BY day DESC, event ASC, source ASC`,
    )
    .all() as EventCountRow[];
}

const TEST_EMAIL_SQL = `(
  lower(email) LIKE 'trial.verify%'
  OR lower(email) LIKE '%@example.com'
  OR lower(email) LIKE '%@mail.grokbot.com'
)`;

/** Signup and checkout totals from account tables, excluding test emails. */
export function accountTrackStats() {
  const db = getDb();
  const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(
    (row) => row.name,
  );
  const trialSignups =
    tables.includes("waitlist")
      ? (db
          .prepare(
            `SELECT COUNT(*) AS n FROM waitlist
             WHERE source = 'trial' AND NOT ${TEST_EMAIL_SQL}`,
          )
          .get() as { n: number }).n
      : 0;
  const trialing =
    tables.includes("users")
      ? (db
          .prepare(
            `SELECT COUNT(*) AS n FROM users
             WHERE subscription_status = 'trialing' AND NOT ${TEST_EMAIL_SQL}`,
          )
          .get() as { n: number }).n
      : 0;
  return { trialSignups, trialing };
}

export function trackStats() {
  return {
    timezone: "America/Chicago",
    events: eventCounts(),
    accounts: accountTrackStats(),
  };
}

export { trafficSource };
