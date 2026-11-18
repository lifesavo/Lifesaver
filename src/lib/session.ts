import crypto from "node:crypto";
import { cookies } from "next/headers";
import { createSession, deleteSession, userForSession } from "@/lib/accounts";

const SESSION_COOKIE = "lifesaver_session";
const OWNER_COOKIE = "lifesaver_owner";
const secure = process.env.NODE_ENV === "production";

export async function sessionUser() {
  const jar = await cookies();
  return userForSession(jar.get(SESSION_COOKIE)?.value);
}

export async function currentOwnerCookie() {
  const jar = await cookies();
  const value = jar.get(OWNER_COOKIE)?.value;
  return value && /^[0-9a-f-]{36}$/.test(value) ? value : null;
}

/** Sign this browser in. The owner cookie becomes the account id so trips, tokens, and requests follow the account. */
export async function startSession(userId: string) {
  const jar = await cookies();
  const { token, maxAge } = createSession(userId);
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge });
  jar.set(OWNER_COOKIE, userId, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge });
}

export async function endSession() {
  const jar = await cookies();
  deleteSession(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  // Fresh anonymous owner, so this device no longer sees the account's data.
  jar.set(OWNER_COOKIE, crypto.randomUUID(), { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 400 * 86400 });
}

export function clientKey(request: Request) {
  return (request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local").trim();
}
