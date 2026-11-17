import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

type SignupResult =
  | { ok: true; already: boolean; id: number | null; count: number }
  | { ok: false; message: string };

const globalForDb = globalThis as unknown as { ymlsDb?: Database.Database };

function getDb() {
  if (!globalForDb.ymlsDb) {
    const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const db = new Database(path.join(dir, "waitlist.sqlite"));
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        zip TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    globalForDb.ymlsDb = db;
  }
  return globalForDb.ymlsDb;
}

export function countSignups() {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM waitlist").get() as {
    n: number;
  };
  return row.n;
}

export function addSignup(email: string, zip: string | null): SignupResult {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM waitlist WHERE email = ?")
    .get(email) as { id: number } | undefined;
  if (existing) {
    return { ok: true, already: true, id: existing.id, count: countSignups() };
  }
  const info = db
    .prepare("INSERT INTO waitlist (email, zip) VALUES (?, ?)")
    .run(email, zip);
  return {
    ok: true,
    already: false,
    id: Number(info.lastInsertRowid),
    count: countSignups(),
  };
}
