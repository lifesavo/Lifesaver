import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { Attribution } from "@/lib/attribution";

type SignupResult =
  | { ok: true; already: boolean; id: number | null; count: number; founding: boolean; shareCode: string }
  | { ok: false; message: string };

const globalForDb = globalThis as unknown as { lifesaverDb?: Database.Database };

function ensureSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      zip TEXT,
      ref_code TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      founding INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS ask_usage (
      client_id TEXT NOT NULL,
      day TEXT NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (client_id, day)
    )
  `);
  const columns = new Set(
    (db.prepare("PRAGMA table_info(waitlist)").all() as { name: string }[]).map(
      (column) => column.name,
    ),
  );
  for (const column of ["ref_code", "utm_source", "utm_medium", "utm_campaign"]) {
    if (!columns.has(column)) db.exec(`ALTER TABLE waitlist ADD COLUMN ${column} TEXT`);
  }
  if (!columns.has("founding")) {
    db.exec("ALTER TABLE waitlist ADD COLUMN founding INTEGER NOT NULL DEFAULT 1");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS nights_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      event_date TEXT NOT NULL,
      venue TEXT NOT NULL,
      deal TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      public_rsvp INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS nights_rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      founding INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(event_id, email)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS nights_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_id TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(city_id, email)
    )
  `);
}

export function isFoundingEmail(email: string) {
  const row = getDb()
    .prepare("SELECT founding FROM waitlist WHERE email = ?")
    .get(email.trim().toLowerCase()) as { founding: number } | undefined;
  return Boolean(row && row.founding !== 0);
}

function getDb() {
  if (!globalForDb.lifesaverDb) {
    const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const db = new Database(path.join(dir, "waitlist.sqlite"));
    db.pragma("journal_mode = WAL");
    globalForDb.lifesaverDb = db;
  }
  ensureSchema(globalForDb.lifesaverDb);
  return globalForDb.lifesaverDb;
}

export function countSignups() {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM waitlist").get() as { n: number };
  return row.n;
}

export function addSignup(
  email: string,
  zip: string | null,
  attribution: Attribution,
): SignupResult {
  const db = getDb();
  const existing = db.prepare("SELECT id, founding FROM waitlist WHERE email = ?").get(email) as
    | { id: number; founding: number }
    | undefined;
  if (existing) {
    return {
      ok: true,
      already: true,
      id: existing.id,
      count: countSignups(),
      founding: existing.founding !== 0,
      shareCode: `f${existing.id}`,
    };
  }
  const info = db
    .prepare(
      `INSERT INTO waitlist (email, zip, ref_code, utm_source, utm_medium, utm_campaign, founding)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    )
    .run(
      email,
      zip,
      attribution.ref,
      attribution.utmSource,
      attribution.utmMedium,
      attribution.utmCampaign,
    );
  const id = Number(info.lastInsertRowid);
  return {
    ok: true,
    already: false,
    id,
    count: countSignups(),
    founding: true,
    shareCode: `f${id}`,
  };
}

export function waitlistStats() {
  const db = getDb();
  const bySource = db
    .prepare(
      `SELECT COALESCE(NULLIF(utm_source, ''), 'direct') AS source, COUNT(*) AS n
       FROM waitlist GROUP BY source ORDER BY n DESC`,
    )
    .all() as { source: string; n: number }[];
  const byRef = db
    .prepare(
      `SELECT COALESCE(NULLIF(ref_code, ''), '(none)') AS ref, COUNT(*) AS n
       FROM waitlist GROUP BY ref ORDER BY n DESC`,
    )
    .all() as { ref: string; n: number }[];
  return { count: countSignups(), bySource, byRef };
}

const FREE_ASKS_PER_DAY = 3;

export function takeAsk(clientId: string, unlimited: boolean) {
  if (unlimited) return { allowed: true, remaining: null as number | null };
  const db = getDb();
  const day = new Date().toISOString().slice(0, 10);
  const row = db
    .prepare("SELECT count FROM ask_usage WHERE client_id = ? AND day = ?")
    .get(clientId, day) as { count: number } | undefined;
  const count = row?.count ?? 0;
  if (count >= FREE_ASKS_PER_DAY) return { allowed: false, remaining: 0 };
  db.prepare(
    `INSERT INTO ask_usage (client_id, day, count) VALUES (?, ?, 1)
     ON CONFLICT(client_id, day) DO UPDATE SET count = count + 1`,
  ).run(clientId, day);
  return { allowed: true, remaining: FREE_ASKS_PER_DAY - count - 1 };
}

export type NightEvent = {
  id: number;
  cityId: string;
  kind: "girls" | "guys";
  eventDate: string;
  venue: string;
  deal: string;
  capacity: number;
  publicRsvp: boolean;
  rsvpCount: number;
  youRsvped: boolean;
};

export function listNightEvents(cityId: string, email: string): NightEvent[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, city_id, kind, event_date, venue, deal, capacity, public_rsvp
       FROM nights_events WHERE city_id = ? ORDER BY event_date ASC`,
    )
    .all(cityId) as Array<{
    id: number;
    city_id: string;
    kind: string;
    event_date: string;
    venue: string;
    deal: string;
    capacity: number;
    public_rsvp: number;
  }>;
  return rows.map((row) => {
    const count = db
      .prepare("SELECT COUNT(*) AS n FROM nights_rsvps WHERE event_id = ?")
      .get(row.id) as { n: number };
    const mine = email
      ? db.prepare("SELECT 1 AS ok FROM nights_rsvps WHERE event_id = ? AND email = ?").get(row.id, email)
      : undefined;
    return {
      id: row.id,
      cityId: row.city_id,
      kind: row.kind === "guys" ? "guys" : "girls",
      eventDate: row.event_date,
      venue: row.venue,
      deal: row.deal,
      capacity: row.capacity,
      publicRsvp: row.public_rsvp !== 0,
      rsvpCount: count.n,
      youRsvped: Boolean(mine),
    };
  });
}

export function voteForCity(cityId: string, email: string) {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM nights_votes WHERE city_id = ? AND email = ?")
    .get(cityId, email) as { id: number } | undefined;
  if (!existing) {
    db.prepare("INSERT INTO nights_votes (city_id, email) VALUES (?, ?)").run(cityId, email);
  }
  const count = db
    .prepare("SELECT COUNT(*) AS n FROM nights_votes WHERE city_id = ?")
    .get(cityId) as { n: number };
  return { already: Boolean(existing), count: count.n };
}

export function voteRanking() {
  return getDb()
    .prepare(
      `SELECT city_id AS cityId, COUNT(*) AS n FROM nights_votes GROUP BY city_id ORDER BY n DESC, city_id ASC`,
    )
    .all() as { cityId: string; n: number }[];
}

export function rsvpToEvent(eventId: number, email: string) {
  const db = getDb();
  const event = db
    .prepare("SELECT id, capacity, public_rsvp FROM nights_events WHERE id = ?")
    .get(eventId) as { id: number; capacity: number; public_rsvp: number } | undefined;
  if (!event) return { ok: false as const, message: "That event is not posted." };
  const founding = isFoundingEmail(email);
  if (event.public_rsvp === 0 && !founding) {
    return {
      ok: false as const,
      message: "Founding members can RSVP first. Join the waitlist with this email to lock early access.",
    };
  }
  const count = db
    .prepare("SELECT COUNT(*) AS n FROM nights_rsvps WHERE event_id = ?")
    .get(eventId) as { n: number };
  const already = db
    .prepare("SELECT id FROM nights_rsvps WHERE event_id = ? AND email = ?")
    .get(eventId, email) as { id: number } | undefined;
  if (already) return { ok: true as const, already: true, count: count.n };
  if (count.n >= event.capacity) return { ok: false as const, message: "This night is full." };
  db.prepare("INSERT INTO nights_rsvps (event_id, email, founding) VALUES (?, ?, ?)").run(
    eventId,
    email,
    founding ? 1 : 0,
  );
  return { ok: true as const, already: false, count: count.n + 1 };
}

export function createNightEvent(input: {
  cityId: string;
  kind: "girls" | "guys";
  eventDate: string;
  venue: string;
  deal: string;
  capacity: number;
  publicRsvp: boolean;
}) {
  const info = getDb()
    .prepare(
      `INSERT INTO nights_events (city_id, kind, event_date, venue, deal, capacity, public_rsvp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.cityId,
      input.kind,
      input.eventDate,
      input.venue,
      input.deal,
      input.capacity,
      input.publicRsvp ? 1 : 0,
    );
  return Number(info.lastInsertRowid);
}
