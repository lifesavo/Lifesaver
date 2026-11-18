import { connection } from "next/server";
import { json, readBody } from "@/lib/account-api";
import { billingOpen, type BillingPlan } from "@/lib/billing-config";
import { createCheckoutSession, siteUrl } from "@/lib/stripe";
import { sessionUser } from "@/lib/session";

/** Start Stripe Checkout for Premium or Lend a Hand. Founding members get the founding price. */
export async function POST(request: Request) {
  await connection();
  if (!billingOpen()) return json({ ok: false, message: "Billing opens soon. Your founding rate can be locked in now." }, 503);
  const user = await sessionUser();
  if (!user) return json({ ok: false, message: "Sign in or create your account first." }, 401);
  const body = await readBody<{ plan: BillingPlan }>(request);
  const plan = body?.plan === "premium" || body?.plan === "hand" ? body.plan : null;
  if (!plan) return json({ ok: false, message: "Pick Premium or Lend a Hand." }, 400);
  if (user.subscription_status && ["active", "trialing", "past_due"].includes(user.subscription_status)) {
    return json({ ok: false, message: "You already have a plan. Use Manage billing in Settings to change it." }, 409);
  }
  try {
    const session = await createCheckoutSession({
      plan,
      founding: user.founding !== 0,
      userId: user.id,
      email: user.email,
      customerId: user.stripe_customer_id,
      siteUrl: siteUrl(request),
    });
    return json({ ok: true, url: session.url });
  } catch (error) {
    console.error("checkout failed", error);
    return json({ ok: false, message: "Checkout didn't open. Try again in a minute." }, 502);
  }
}
