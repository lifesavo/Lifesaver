import { createHash, timingSafeEqual } from "node:crypto";

/** Checks Authorization: Bearer <ADMIN_TOKEN> (or x-admin-token). */
export function checkAdmin(request: Request): "ok" | "missing" | "denied" {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return "missing";
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const presented = bearer || request.headers.get("x-admin-token")?.trim() || "";
  if (!presented) return "denied";
  const left = createHash("sha256").update(presented).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right) ? "ok" : "denied";
}
