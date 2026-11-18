import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { Attribution } from "@/lib/attribution";

type SignupResult =
  | { ok: true; already: boolean; id: number | null; count: number }
  | { ok: false; message: string };

const globalForDb = globalThis as unknown as { lifesaverDb?: Database.Database };

function getDb() {
  if (!globalForDb.lifesaverDb) {
    const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const db = new Database(path.join(dir, "waitlist.sqlite"));
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        zip TEXT,
        ref_code TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    const columns = new Set(
      (db.prepare("PRAGMA table_info(waitlist)").all() as { name: string }[]).map(
        (column) => column.name,
      ),
    );
    for (const column of ["ref_code", "utm_source", "utm_medium", "utm_campaign"]) {
      if (!columns.has(column)) {
        db.exec(`ALTER TABLE waitlist ADD COLUMN ${column} TEXT`);
      }
    }
    globalForDb.lifesaverDb = db;
  }
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
  const existing = db.prepare("SELECT id FROM waitlist WHERE email = ?").get(email) as
    | { id: number }
    | undefined;
  if (existing) {
    return { ok: true, already: true, id: existing.id, count: countSignups() };
  }
  const info = db
    .prepare(
      `INSERT INTO waitlist (email, zip, ref_code, utm_source, utm_medium, utm_campaign)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      email,
      zip,
      attribution.ref,
      attribution.utmSource,
      attribution.utmMedium,
      attribution.utmCampaign,
    );
  return {
    ok: true,
    already: false,
    id: Number(info.lastInsertRowid),
    count: countSignups(),
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
