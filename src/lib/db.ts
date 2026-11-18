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
