import crypto from "node:crypto";
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS giveaway_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_key TEXT NOT NULL,
      email TEXT NOT NULL,
      dedupe_key TEXT NOT NULL,
      first_name TEXT,
      last_initial TEXT,
      method TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(week_key, dedupe_key)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS giveaway_winners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_key TEXT NOT NULL,
      entry_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      first_name TEXT,
      last_initial TEXT,
      entrants INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      drawn_at TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at TEXT,
      paid_note TEXT
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS giveaway_rate (
      client_key TEXT NOT NULL,
      hour TEXT NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (client_key, hour)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      prefix TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT,
      revoked_at TEXT
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS ai_tokens_owner ON ai_tokens (owner_id)");
  db.exec(`
    CREATE TABLE IF NOT EXISTS roadside_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_id TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL,
      issue TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      note TEXT,
      contact_name TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      helper_owner_id TEXT,
      helper_name TEXT,
      helper_phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      accepted_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS roadside_status ON roadside_requests (status, created_at)");
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_trips (
      owner_id TEXT NOT NULL,
      trip_id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (owner_id, trip_id)
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

// ---------------------------------------------------------------------------
// Weekly $100 giveaway. One equal entry per person per week. Plan tier is
// never read here: free and paid members have exactly the same single chance.

export type GiveawayMethod = "signup" | "app" | "amoe";

/** Gmail ignores dots and +tags, so treat those as the same person. */
export function giveawayDedupeKey(email: string) {
  const [local, domain] = email.trim().toLowerCase().split("@");
  if (!domain) return email.trim().toLowerCase();
  let name = local.split("+")[0];
  const host = domain === "googlemail.com" ? "gmail.com" : domain;
  if (host === "gmail.com") name = name.replace(/\./g, "");
  return `${name}@${host}`;
}

export function enterGiveaway(input: {
  weekKey: string;
  email: string;
  firstName: string | null;
  lastInitial: string | null;
  method: GiveawayMethod;
}) {
  const db = getDb();
  const dedupe = giveawayDedupeKey(input.email);
  const existing = db
    .prepare("SELECT id, first_name FROM giveaway_entries WHERE week_key = ? AND dedupe_key = ?")
    .get(input.weekKey, dedupe) as { id: number; first_name: string | null } | undefined;
  if (existing) {
    if (!existing.first_name && input.firstName) {
      db.prepare("UPDATE giveaway_entries SET first_name = ?, last_initial = ? WHERE id = ?").run(
        input.firstName,
        input.lastInitial,
        existing.id,
      );
    }
    return { already: true, id: existing.id };
  }
  const info = db
    .prepare(
      `INSERT INTO giveaway_entries (week_key, email, dedupe_key, first_name, last_initial, method)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(input.weekKey, input.email.trim().toLowerCase(), dedupe, input.firstName, input.lastInitial, input.method);
  return { already: false, id: Number(info.lastInsertRowid) };
}

export function hasGiveawayEntry(weekKey: string, email: string) {
  return Boolean(
    getDb()
      .prepare("SELECT 1 AS ok FROM giveaway_entries WHERE week_key = ? AND dedupe_key = ?")
      .get(weekKey, giveawayDedupeKey(email)),
  );
}

export function countGiveawayEntries(weekKey: string) {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM giveaway_entries WHERE week_key = ?")
    .get(weekKey) as { n: number };
  return row.n;
}

/** Simple fixed-window limiter. Returns false when the client is over the limit. */
export function takeGiveawayRate(clientKey: string, limitPerHour: number) {
  const db = getDb();
  const hour = new Date().toISOString().slice(0, 13);
  const row = db
    .prepare("SELECT count FROM giveaway_rate WHERE client_key = ? AND hour = ?")
    .get(clientKey, hour) as { count: number } | undefined;
  if ((row?.count ?? 0) >= limitPerHour) return false;
  db.prepare(
    `INSERT INTO giveaway_rate (client_key, hour, count) VALUES (?, ?, 1)
     ON CONFLICT(client_key, hour) DO UPDATE SET count = count + 1`,
  ).run(clientKey, hour);
  db.prepare("DELETE FROM giveaway_rate WHERE hour < ?").run(
    new Date(Date.now() - 48 * 3600 * 1000).toISOString().slice(0, 13),
  );
  return true;
}

export type GiveawayEntryRow = {
  id: number;
  email: string;
  firstName: string | null;
  lastInitial: string | null;
  method: GiveawayMethod;
  createdAt: string;
};

export function listGiveawayEntries(weekKey: string): GiveawayEntryRow[] {
  return getDb()
    .prepare(
      `SELECT id, email, first_name AS firstName, last_initial AS lastInitial, method, created_at AS createdAt
       FROM giveaway_entries WHERE week_key = ? ORDER BY id ASC`,
    )
    .all(weekKey) as GiveawayEntryRow[];
}

export type GiveawayWinnerRow = {
  id: number;
  weekKey: string;
  entryId: number;
  email: string;
  firstName: string | null;
  lastInitial: string | null;
  entrants: number;
  status: "pending" | "paid" | "forfeited";
  drawnAt: string;
  paidAt: string | null;
  paidNote: string | null;
};

const WINNER_COLUMNS = `id, week_key AS weekKey, entry_id AS entryId, email, first_name AS firstName,
  last_initial AS lastInitial, entrants, status, drawn_at AS drawnAt, paid_at AS paidAt, paid_note AS paidNote`;

export function listGiveawayWinners(limit = 52): GiveawayWinnerRow[] {
  return getDb()
    .prepare(`SELECT ${WINNER_COLUMNS} FROM giveaway_winners ORDER BY week_key DESC, id DESC LIMIT ?`)
    .all(limit) as GiveawayWinnerRow[];
}

/** Latest non-forfeited winner for a week, for the public "last week" line. */
export function publicWinnerFor(weekKey: string) {
  const row = getDb()
    .prepare(
      `SELECT first_name AS firstName, last_initial AS lastInitial, status FROM giveaway_winners
       WHERE week_key = ? AND status != 'forfeited' ORDER BY id DESC LIMIT 1`,
    )
    .get(weekKey) as { firstName: string | null; lastInitial: string | null; status: string } | undefined;
  return row ?? null;
}

/**
 * Uniform random pick among the week's entries. Each entry is one equal
 * chance. People who already won (or forfeited) this week are excluded so an
 * alternate can be drawn. Uses a cryptographically secure RNG.
 */
export function drawGiveawayWinner(weekKey: string, randomIndex: (n: number) => number) {
  const db = getDb();
  return db.transaction(() => {
    const active = db
      .prepare("SELECT id FROM giveaway_winners WHERE week_key = ? AND status IN ('pending', 'paid')")
      .get(weekKey) as { id: number } | undefined;
    if (active) {
      return { ok: false as const, message: "This week already has a winner. Mark them forfeited before drawing an alternate." };
    }
    const pool = db
      .prepare(
        `SELECT id, email, first_name AS firstName, last_initial AS lastInitial FROM giveaway_entries
         WHERE week_key = ? AND dedupe_key NOT IN (
           SELECT e.dedupe_key FROM giveaway_winners w JOIN giveaway_entries e ON e.id = w.entry_id
           WHERE w.week_key = ?
         ) ORDER BY id ASC`,
      )
      .all(weekKey, weekKey) as Array<{ id: number; email: string; firstName: string | null; lastInitial: string | null }>;
    if (pool.length === 0) return { ok: false as const, message: "No eligible entries for that week." };
    const pick = pool[randomIndex(pool.length)];
    const info = db
      .prepare(
        `INSERT INTO giveaway_winners (week_key, entry_id, email, first_name, last_initial, entrants)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(weekKey, pick.id, pick.email, pick.firstName, pick.lastInitial, pool.length);
    const winner = db
      .prepare(`SELECT ${WINNER_COLUMNS} FROM giveaway_winners WHERE id = ?`)
      .get(Number(info.lastInsertRowid)) as GiveawayWinnerRow;
    return { ok: true as const, winner };
  })();
}

export function setGiveawayWinnerStatus(id: number, status: "paid" | "forfeited", note: string | null) {
  const info = getDb()
    .prepare(
      `UPDATE giveaway_winners SET status = ?, paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE paid_at END,
       paid_note = COALESCE(?, paid_note) WHERE id = ?`,
    )
    .run(status, status, note, id);
  return info.changes > 0;
}

// ---- Personal AI access tokens. Only a SHA-256 hash of each token is stored. ----

export type AiTokenRow = { id: number; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function createAiToken(ownerId: string, name: string) {
  const db = getDb();
  const active = db.prepare("SELECT COUNT(*) AS n FROM ai_tokens WHERE owner_id = ? AND revoked_at IS NULL").get(ownerId) as { n: number };
  if (active.n >= 10) return { ok: false as const, message: "You can have up to 10 active tokens. Revoke one first." };
  const raw = `ls_pat_${crypto.randomBytes(24).toString("base64url")}`;
  const info = db
    .prepare("INSERT INTO ai_tokens (owner_id, name, token_hash, prefix) VALUES (?, ?, ?, ?)")
    .run(ownerId, name.slice(0, 40) || "My AI", hashToken(raw), raw.slice(0, 11));
  return { ok: true as const, id: Number(info.lastInsertRowid), token: raw };
}

export function listAiTokens(ownerId: string): AiTokenRow[] {
  return getDb()
    .prepare(
      `SELECT id, name, prefix, created_at AS createdAt, last_used_at AS lastUsedAt, revoked_at AS revokedAt
       FROM ai_tokens WHERE owner_id = ? ORDER BY id DESC LIMIT 50`,
    )
    .all(ownerId) as AiTokenRow[];
}

export function revokeAiToken(ownerId: string, id: number) {
  return (
    getDb().prepare("UPDATE ai_tokens SET revoked_at = datetime('now') WHERE owner_id = ? AND id = ? AND revoked_at IS NULL").run(ownerId, id)
      .changes > 0
  );
}

/** Returns the owner for an active token, or null. */
export function ownerForToken(raw: string): string | null {
  if (!/^ls_pat_[A-Za-z0-9_-]{20,64}$/.test(raw)) return null;
  const db = getDb();
  const row = db.prepare("SELECT id, owner_id AS ownerId FROM ai_tokens WHERE token_hash = ? AND revoked_at IS NULL").get(hashToken(raw)) as
    | { id: number; ownerId: string }
    | undefined;
  if (!row) return null;
  db.prepare("UPDATE ai_tokens SET last_used_at = datetime('now') WHERE id = ?").run(row.id);
  return row.ownerId;
}

// ---- Trips saved to the server so a user's own AI can read them. ----

export function listUserTrips(ownerId: string): unknown[] {
  const rows = getDb()
    .prepare("SELECT data FROM user_trips WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 50")
    .all(ownerId) as { data: string }[];
  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.data) as unknown];
    } catch {
      return [];
    }
  });
}

export function saveUserTrip(ownerId: string, tripId: string, data: unknown) {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) AS n FROM user_trips WHERE owner_id = ?").get(ownerId) as { n: number };
  const exists = db.prepare("SELECT 1 FROM user_trips WHERE owner_id = ? AND trip_id = ?").get(ownerId, tripId);
  if (!exists && count.n >= 50) return false;
  db.prepare(
    `INSERT INTO user_trips (owner_id, trip_id, data) VALUES (?, ?, ?)
     ON CONFLICT(owner_id, trip_id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`,
  ).run(ownerId, tripId.slice(0, 64), JSON.stringify(data).slice(0, 200_000));
  return true;
}

export function deleteUserTrip(ownerId: string, tripId: string) {
  return getDb().prepare("DELETE FROM user_trips WHERE owner_id = ? AND trip_id = ?").run(ownerId, tripId).changes > 0;
}

// ---- Roadside help requests from people stranded, answered by nearby Lend a Hand helpers. ----

export type RoadsideStatus = "open" | "accepted" | "done" | "cancelled";

type RoadsideRow = {
  id: number;
  public_id: string;
  owner_id: string;
  issue: string;
  lat: number;
  lng: number;
  note: string | null;
  contact_name: string;
  contact_phone: string;
  status: RoadsideStatus;
  helper_owner_id: string | null;
  helper_name: string | null;
  helper_phone: string | null;
  created_at: string;
  accepted_at: string | null;
  updated_at: string;
};

/** Open requests older than this drop off the helper list. */
const ROADSIDE_OPEN_HOURS = 6;

export type RoadsideView = {
  id: string;
  issue: string;
  status: RoadsideStatus;
  note: string | null;
  createdAt: string;
  acceptedAt: string | null;
  updatedAt: string;
  /** Exact for the requester and the accepted helper; rounded (about 1 km) for everyone else. */
  lat: number;
  lng: number;
  exact: boolean;
  role: "requester" | "helper" | "viewer";
  requester?: { name: string; phone: string };
  helper?: { name: string; phone: string } | null;
  expired: boolean;
};

function roadsideView(row: RoadsideRow, viewer: string | null): RoadsideView {
  const role = viewer && row.owner_id === viewer ? "requester" : viewer && row.helper_owner_id === viewer ? "helper" : "viewer";
  const exact = role !== "viewer";
  const ageHours = (Date.now() - Date.parse(`${row.created_at.replace(" ", "T")}Z`)) / 3600000;
  return {
    id: row.public_id,
    issue: row.issue,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    updatedAt: row.updated_at,
    lat: exact ? row.lat : Math.round(row.lat * 100) / 100,
    lng: exact ? row.lng : Math.round(row.lng * 100) / 100,
    exact,
    role,
    requester: role === "helper" ? { name: row.contact_name, phone: row.contact_phone } : undefined,
    helper: role === "requester" ? (row.helper_name ? { name: row.helper_name, phone: row.helper_phone ?? "" } : null) : undefined,
    expired: row.status === "open" && ageHours > ROADSIDE_OPEN_HOURS,
  };
}

export function createRoadsideRequest(input: {
  ownerId: string;
  issue: string;
  lat: number;
  lng: number;
  note: string | null;
  name: string;
  phone: string;
}) {
  const db = getDb();
  const openMine = db
    .prepare("SELECT COUNT(*) AS n FROM roadside_requests WHERE owner_id = ? AND status IN ('open','accepted') AND created_at > datetime('now', '-6 hours')")
    .get(input.ownerId) as { n: number };
  if (openMine.n >= 3) return { ok: false as const, message: "You already have 3 open requests. Cancel one first." };
  const publicId = `rh_${crypto.randomBytes(9).toString("base64url")}`;
  db.prepare(
    `INSERT INTO roadside_requests (public_id, owner_id, issue, lat, lng, note, contact_name, contact_phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(publicId, input.ownerId, input.issue, input.lat, input.lng, input.note, input.name, input.phone);
  return { ok: true as const, request: getRoadsideRequest(publicId, input.ownerId)! };
}

export function getRoadsideRequest(publicId: string, viewer: string | null) {
  const row = getDb().prepare("SELECT * FROM roadside_requests WHERE public_id = ?").get(publicId) as RoadsideRow | undefined;
  return row ? roadsideView(row, viewer) : null;
}

export function listMyRoadside(viewer: string) {
  const rows = getDb()
    .prepare("SELECT * FROM roadside_requests WHERE owner_id = ? OR helper_owner_id = ? ORDER BY id DESC LIMIT 20")
    .all(viewer, viewer) as RoadsideRow[];
  return rows.map((row) => roadsideView(row, viewer));
}

export function listOpenRoadside(viewer: string | null) {
  const rows = getDb()
    .prepare(
      `SELECT * FROM roadside_requests WHERE status = 'open' AND created_at > datetime('now', '-${ROADSIDE_OPEN_HOURS} hours')
       ORDER BY id DESC LIMIT 200`,
    )
    .all() as RoadsideRow[];
  return rows.map((row) => roadsideView(row, viewer));
}

export function acceptRoadside(publicId: string, helper: { ownerId: string; name: string; phone: string }) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM roadside_requests WHERE public_id = ?").get(publicId) as RoadsideRow | undefined;
  if (!row) return { ok: false as const, message: "That request is gone." };
  if (row.owner_id === helper.ownerId) return { ok: false as const, message: "You can't accept your own request." };
  const info = db
    .prepare(
      `UPDATE roadside_requests SET status = 'accepted', helper_owner_id = ?, helper_name = ?, helper_phone = ?,
       accepted_at = datetime('now'), updated_at = datetime('now') WHERE public_id = ? AND status = 'open'`,
    )
    .run(helper.ownerId, helper.name, helper.phone, publicId);
  if (!info.changes) return { ok: false as const, message: "Someone already took this one, or it was closed." };
  return { ok: true as const, request: getRoadsideRequest(publicId, helper.ownerId)! };
}

/** Requester can cancel or mark done; the helper can mark done or release it back to open. */
export function updateRoadside(publicId: string, viewer: string, action: "cancel" | "done" | "release") {
  const db = getDb();
  const row = db.prepare("SELECT * FROM roadside_requests WHERE public_id = ?").get(publicId) as RoadsideRow | undefined;
  if (!row) return { ok: false as const, message: "That request is gone." };
  const isOwner = row.owner_id === viewer;
  const isHelper = row.helper_owner_id === viewer;
  if (!isOwner && !isHelper) return { ok: false as const, message: "Only the requester or the helper can change this." };
  if (row.status === "done" || row.status === "cancelled") return { ok: false as const, message: "This request is already closed." };
  if (action === "cancel" && !isOwner) return { ok: false as const, message: "Only the requester can cancel." };
  if (action === "release" && !isHelper) return { ok: false as const, message: "Only the helper can release it." };
  if (action === "release") {
    db.prepare(
      "UPDATE roadside_requests SET status = 'open', helper_owner_id = NULL, helper_name = NULL, helper_phone = NULL, accepted_at = NULL, updated_at = datetime('now') WHERE public_id = ?",
    ).run(publicId);
  } else {
    db.prepare("UPDATE roadside_requests SET status = ?, updated_at = datetime('now') WHERE public_id = ?").run(action === "cancel" ? "cancelled" : "done", publicId);
  }
  return { ok: true as const, request: getRoadsideRequest(publicId, viewer)! };
}
