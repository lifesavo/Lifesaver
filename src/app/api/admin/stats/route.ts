import { connection } from "next/server";
import { json } from "@/lib/account-api";
import { checkAdmin } from "@/lib/admin-auth";
import { trackStats } from "@/lib/track";

/** Read-only first-party counters by day and source. Signup/checkout totals exclude test emails. */
export async function GET(request: Request) {
  await connection();
  const gate = checkAdmin(request);
  if (gate === "missing") {
    return json({ ok: false, message: "Set ADMIN_TOKEN on the server before using this count." }, 503);
  }
  if (gate !== "ok") {
    return json({ ok: false, message: "That admin token does not match." }, 401);
  }
  return json({ ok: true, ...trackStats() });
}
