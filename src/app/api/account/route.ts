import { connection } from "next/server";
import { toPublic, updateUser, type PlanId } from "@/lib/accounts";
import { cleanZip, json, readBody } from "@/lib/account-api";
import { billingOpen } from "@/lib/billing-config";
import { emailEnabled } from "@/lib/email";
import { getDb } from "@/lib/db";
import { endSession, sessionUser } from "@/lib/session";

/** Who is signed in on this browser, plus which sign-in methods are on. */
export async function GET() {
  await connection();
  const user = await sessionUser();
  return json({ user: user ? toPublic(user) : null, emailLogin: emailEnabled(), billingOpen: billingOpen() });
}

/** Update ZIP, or the plan while billing is not open (early access). */
export async function PATCH(request: Request) {
  await connection();
  const user = await sessionUser();
  if (!user) return json({ ok: false, message: "Sign in first." }, 401);
  const body = await readBody<{ zip: string; plan: PlanId }>(request);
  if (!body) return json({ ok: false, message: "Nothing to change." }, 400);
  const change: Parameters<typeof updateUser>[1] = {};
  if (body.zip !== undefined) {
    const zip = cleanZip(body.zip);
    if (!zip) return json({ ok: false, message: "Use a 5-digit ZIP code." }, 400);
    change.zip = zip;
  }
  if (body.plan !== undefined) {
    if (!["free", "premium", "hand"].includes(String(body.plan))) return json({ ok: false, message: "Unknown plan." }, 400);
    if (billingOpen()) return json({ ok: false, message: "Plans change through checkout now." }, 409);
    change.plan = body.plan as PlanId;
  }
  const next = updateUser(user.id, change);
  return json({ ok: true, user: next ? toPublic(next) : null });
}

/** Delete this account and sign out. Paid subscriptions must be canceled first. */
export async function DELETE() {
  await connection();
  const user = await sessionUser();
  if (!user) return json({ ok: false, message: "Sign in first." }, 401);
  if (user.subscription_status && ["active", "trialing", "past_due"].includes(user.subscription_status)) {
    return json({ ok: false, message: "Cancel your plan in Manage billing first, then delete the account." }, 409);
  }
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
  db.prepare("DELETE FROM login_codes WHERE user_id = ?").run(user.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  await endSession();
  return json({ ok: true });
}
