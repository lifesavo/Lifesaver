import { connection } from "next/server";
import { json } from "@/lib/account-api";
import { billingOpen } from "@/lib/billing-config";
import { createPortalSession, siteUrl } from "@/lib/stripe";
import { sessionUser } from "@/lib/session";

/** Stripe's hosted billing page: change card, switch plan, or cancel. */
export async function POST(request: Request) {
  await connection();
  if (!billingOpen()) return json({ ok: false, message: "Billing isn't open yet." }, 503);
  const user = await sessionUser();
  if (!user) return json({ ok: false, message: "Sign in first." }, 401);
  if (!user.stripe_customer_id) return json({ ok: false, message: "No billing on this account yet." }, 404);
  try {
    const portal = await createPortalSession(user.stripe_customer_id, siteUrl(request));
    return json({ ok: true, url: portal.url });
  } catch (error) {
    console.error("portal failed", error);
    return json({ ok: false, message: "Billing page didn't open. Try again." }, 502);
  }
}
