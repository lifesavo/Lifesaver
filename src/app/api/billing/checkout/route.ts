import { connection } from "next/server";
import { json, readBody } from "@/lib/account-api";
import { billingOpen, type BillingPlan } from "@/lib/billing-config";
import { TRIAL_DAYS } from "@/lib/pricing";
import { readAttribution } from "@/lib/attribution";
import { createCheckoutSession, siteUrl } from "@/lib/stripe";
import { sessionUser } from "@/lib/session";
import { isTestEmail, recordTrackedEvent, recordUniqueTrackedEvent } from "@/lib/track";

/** Start Stripe Checkout for Premium or Lend a Hand. Founding members get the founding price. */
export async function POST(request: Request) {
  await connection();
  if (!billingOpen()) return json({ ok: false, message: "Billing opens soon. Your founding rate can be locked in now." }, 503);
  const user = await sessionUser();
  if (!user) return json({ ok: false, message: "Sign in or create your account first." }, 401);
  const body = await readBody<{ plan: BillingPlan; trial?: boolean; utm_source?: string; ref?: string }>(request);
  const plan = body?.plan === "premium" || body?.plan === "hand" ? body.plan : null;
  if (!plan) return json({ ok: false, message: "Pick Premium or Lend a Hand." }, 400);
  if (user.subscription_status && ["active", "trialing", "past_due"].includes(user.subscription_status)) {
    return json({ ok: false, message: "You already have a plan. Use Manage billing in Settings to change it." }, 409);
  }
  // 7-day free trial is for Premium sign-ups from Try it free (card is still collected up front).
  const trialPeriodDays = body?.trial && plan === "premium" ? TRIAL_DAYS : undefined;
  const attribution = readAttribution({ utm_source: body?.utm_source, ref: body?.ref });
  try {
    const session = await createCheckoutSession({
      plan,
      founding: user.founding !== 0,
      userId: user.id,
      email: user.email,
      customerId: user.stripe_customer_id,
      siteUrl: siteUrl(request),
      trialPeriodDays,
      trafficSource: attribution.utmSource || attribution.ref || undefined,
    });
    if (trialPeriodDays && !isTestEmail(user.email)) {
      recordUniqueTrackedEvent(`checkout_created:${session.id}`, "trial_checkout_created", {
        utm_source: attribution.utmSource,
        ref: attribution.ref,
      });
    }
    return json({ ok: true, url: session.url });
  } catch (error) {
    console.error("checkout failed", error);
    if (trialPeriodDays && !isTestEmail(user.email)) {
      recordTrackedEvent("trial_checkout_failed", { utm_source: attribution.utmSource, ref: attribution.ref });
    }
    return json({ ok: false, message: "Checkout didn't open. Try again in a minute." }, 502);
  }
}
