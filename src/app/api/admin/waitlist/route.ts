import { createHash, timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { waitlistStats } from "@/lib/db";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function tokenMatches(presented: string, expected: string) {
  const left = createHash("sha256").update(presented).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  await connection();
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return json(
      { ok: false, message: "Set ADMIN_TOKEN on the server before using this count." },
      503,
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  const alternate = request.headers.get("x-admin-token")?.trim() ?? "";
  const presented = bearer || alternate;
  if (!presented || !tokenMatches(presented, expected)) {
    return json({ ok: false, message: "That admin token does not match." }, 401);
  }

  return json({ ok: true, ...waitlistStats() });
}
