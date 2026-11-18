import { connection } from "next/server";
import { savePlanInterest } from "@/lib/db";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Save "lock in my founding rate" while billing is not open yet. No card, no charge. */
export async function POST(request: Request) {
  await connection();
  let body: { email?: unknown; plan?: unknown; zip?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, message: "Send an email and a plan." }, 400);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const plan = body.plan === "premium" || body.plan === "hand" ? body.plan : null;
  const zip = typeof body.zip === "string" && /^\d{5}$/.test(body.zip) ? body.zip : null;
  if (!email || email.length > 254 || !EMAIL.test(email)) {
    return json({ ok: false, message: "Enter an email like alex@example.com." }, 400);
  }
  if (!plan) return json({ ok: false, message: "Pick Premium or Lend a Hand." }, 400);
  const result = savePlanInterest(email, plan, zip);
  return json({ ok: true, plan, founding: result.founding });
}
