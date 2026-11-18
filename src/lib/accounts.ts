import crypto from "node:crypto";
import type Database from "better-sqlite3";
import { getDb, isFoundingEmail } from "@/lib/db";

export type PlanId = "free" | "premium" | "hand";

export type UserRow = {
  id: string;
  email: string;
  zip: string | null;
  plan: PlanId;
  founding: number;
  email_verified: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  created_at: string;
};

export type PublicUser = {
  id: string;
  email: string;
  zip: string | null;
  plan: PlanId;
  founding: boolean;
  emailVerified: boolean;
  subscriptionStatus: string | null;
  hasBilling: boolean;
};

let ready = false;

function db(): Database.Database {
  const conn = getDb();
  if (!ready) {
    conn.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        zip TEXT,
        plan TEXT NOT NULL DEFAULT 'free',
        founding INTEGER NOT NULL DEFAULT 1,
        email_verified INTEGER NOT NULL DEFAULT 0,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        subscription_status TEXT,
        subscription_plan TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    conn.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        last_seen_at TEXT
      )
    `);
    conn.exec("CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id)");
    conn.exec(`
      CREATE TABLE IF NOT EXISTS login_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        purpose TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        used_at TEXT
      )
    `);
    conn.exec("CREATE INDEX IF NOT EXISTS login_codes_user ON login_codes (user_id, used_at)");
    conn.exec(`
      CREATE TABLE IF NOT EXISTS auth_rate (
        key TEXT NOT NULL,
        hour TEXT NOT NULL,
        count INTEGER NOT NULL,
        PRIMARY KEY (key, hour)
      )
    `);
    ready = true;
  }
  return conn;
}

const sha = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const isoIn = (ms: number) => new Date(Date.now() + ms).toISOString();

export function toPublic(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    zip: user.zip,
    plan: (["free", "premium", "hand"].includes(user.plan) ? user.plan : "free") as PlanId,
    founding: user.founding !== 0,
    emailVerified: user.email_verified !== 0,
    subscriptionStatus: user.subscription_status,
    hasBilling: Boolean(user.stripe_customer_id),
  };
}

export function userByEmail(email: string) {
  return db().prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase()) as UserRow | undefined;
}

export function userById(id: string) {
  return db().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function userByStripeCustomer(customerId: string) {
  return db().prepare("SELECT * FROM users WHERE stripe_customer_id = ?").get(customerId) as UserRow | undefined;
}

/** Create an account. Reuses this device's owner id so its trips, tokens, and requests come along. */
export function createUser(input: { email: string; zip: string | null; ownerId: string | null; billingOpen: boolean }) {
  const email = input.email.trim().toLowerCase();
  const id = input.ownerId && !userById(input.ownerId) ? input.ownerId : crypto.randomUUID();
  // Founding members: anyone who joins before billing opens, or who was already on the waitlist.
  const founding = !input.billingOpen || isFoundingEmail(email) ? 1 : 0;
  db()
    .prepare("INSERT INTO users (id, email, zip, founding) VALUES (?, ?, ?, ?)")
    .run(id, email, input.zip, founding);
  return userById(id)!;
}

export function updateUser(id: string, change: Partial<Pick<UserRow, "zip" | "plan" | "email_verified" | "stripe_customer_id" | "stripe_subscription_id" | "subscription_status" | "subscription_plan">>) {
  const keys = Object.keys(change) as (keyof typeof change)[];
  if (!keys.length) return userById(id);
  const sets = keys.map((key) => `${key} = @${key}`).join(", ");
  db()
    .prepare(`UPDATE users SET ${sets}, updated_at = datetime('now') WHERE id = @id`)
    .run({ ...change, id });
  return userById(id);
}

// Sessions -------------------------------------------------------------------

const SESSION_DAYS = 400;

export function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  db()
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(sha(token), userId, isoIn(SESSION_DAYS * 86400_000));
  return { token, maxAge: SESSION_DAYS * 86400 };
}

export function userForSession(token: string | undefined | null) {
  if (!token || token.length < 20 || token.length > 100) return null;
  const row = db()
    .prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?")
    .get(sha(token)) as { user_id: string; expires_at: string } | undefined;
  if (!row || row.expires_at < new Date().toISOString()) return null;
  return userById(row.user_id) ?? null;
}

export function deleteSession(token: string | undefined | null) {
  if (!token) return;
  db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha(token));
}

// One-time codes ---------------------------------------------------------------

const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;

/** A 6-digit code for this account. Purpose "email" is mailed; "device" is shown on a signed-in screen. */
export function createLoginCode(userId: string, purpose: "email" | "device") {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const conn = db();
  // One live code per purpose: replace any older unused ones.
  conn.prepare("UPDATE login_codes SET used_at = datetime('now') WHERE user_id = ? AND purpose = ? AND used_at IS NULL").run(userId, purpose);
  conn
    .prepare("INSERT INTO login_codes (user_id, code_hash, purpose, expires_at) VALUES (?, ?, ?, ?)")
    .run(userId, sha(`${userId}:${code}`), purpose, isoIn(CODE_MINUTES * 60_000));
  return { code, minutes: CODE_MINUTES };
}

/** Check a code against every live code for this account. Returns the purpose it matched. */
export function consumeLoginCode(userId: string, code: string): "email" | "device" | null {
  const conn = db();
  const now = new Date().toISOString();
  const live = conn
    .prepare("SELECT id, code_hash, purpose, attempts FROM login_codes WHERE user_id = ? AND used_at IS NULL AND expires_at > ?")
    .all(userId, now) as { id: number; code_hash: string; purpose: "email" | "device"; attempts: number }[];
  const hash = sha(`${userId}:${code}`);
  for (const row of live) {
    if (row.attempts >= MAX_ATTEMPTS) continue;
    if (crypto.timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(hash))) {
      conn.prepare("UPDATE login_codes SET used_at = datetime('now') WHERE id = ?").run(row.id);
      return row.purpose;
    }
  }
  conn.prepare("UPDATE login_codes SET attempts = attempts + 1 WHERE user_id = ? AND used_at IS NULL AND expires_at > ?").run(userId, now);
  return null;
}

/** Simple hourly rate limit. Returns false when over the limit. */
export function takeAuthRate(key: string, limitPerHour: number) {
  const hour = new Date().toISOString().slice(0, 13);
  const conn = db();
  conn
    .prepare(
      `INSERT INTO auth_rate (key, hour, count) VALUES (?, ?, 1)
       ON CONFLICT(key, hour) DO UPDATE SET count = count + 1`,
    )
    .run(key, hour);
  const row = conn.prepare("SELECT count FROM auth_rate WHERE key = ? AND hour = ?").get(key, hour) as { count: number };
  return row.count <= limitPerHour;
}

/** Move a device's anonymous data (trips, AI tokens, help requests) onto the account. */
export function adoptOwnerData(fromOwner: string | null, toUser: string) {
  if (!fromOwner || fromOwner === toUser) return;
  const conn = db();
  const tables = (conn.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name);
  const tx = conn.transaction(() => {
    if (tables.includes("user_trips")) conn.prepare("UPDATE OR IGNORE user_trips SET owner_id = ? WHERE owner_id = ?").run(toUser, fromOwner);
    if (tables.includes("ai_tokens")) conn.prepare("UPDATE ai_tokens SET owner_id = ? WHERE owner_id = ?").run(toUser, fromOwner);
    if (tables.includes("roadside_requests")) {
      conn.prepare("UPDATE roadside_requests SET owner_id = ? WHERE owner_id = ?").run(toUser, fromOwner);
      conn.prepare("UPDATE roadside_requests SET helper_owner_id = ? WHERE helper_owner_id = ?").run(toUser, fromOwner);
    }
  });
  tx();
}
