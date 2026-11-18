import { cookies } from "next/headers";
import { ownerForToken } from "@/lib/db";

const COOKIE = "lifesaver_owner";

/** The device owner id from the httpOnly cookie. Creates one when asked to. */
export async function cookieOwner(create: boolean): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return existing;
  if (!create) return null;
  const id = crypto.randomUUID();
  jar.set(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 400 });
  return id;
}

export function bearer(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

/** Bearer token first (a user's AI), then the browser cookie. */
export async function requestOwner(request: Request, create = false): Promise<string | null> {
  const token = bearer(request);
  if (token) return ownerForToken(token);
  return cookieOwner(create);
}
