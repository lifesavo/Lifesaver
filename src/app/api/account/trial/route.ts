import { connection } from "next/server";
import { createUser, takeAuthRate, toPublic, userByEmail } from "@/lib/accounts";
import { cleanEmail, isJsonRequest, json, readFormOrJson } from "@/lib/account-api";
import { billingOpen } from "@/lib/billing-config";
import { readAttribution } from "@/lib/attribution";
import { addSignup } from "@/lib/db";
import { TRIAL_DAYS } from "@/lib/pricing";
import { createCheckoutSession, siteUrl } from "@/lib/stripe";
import { clientKey, currentOwnerCookie, sessionUser, startSession } from "@/lib/session";
import { isTestEmail, recordTrackedEvent, recordUniqueTrackedEvent } from "@/lib/track";

type TrialBody = { email: string; utm_source: string; ref: string };

const ERROR_STATUS: Record<string, number> = {
  invalid_email: 400,
  exists: 409,
  billing_closed: 503,
  checkout_failed: 502,
  rate_limit: 429,
  already_subscribed: 409,
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "Enter an email like alex@example.com.",
  exists: "That email already has a LifeSaver account. Sign in with a code.",
  billing_closed: "Billing isn't open on this server yet, so checkout didn't start. Your account is ready — you can open the app now.",
  checkout_failed: "Checkout didn't open. Try again in a minute.",
  rate_limit: "Too many sign-ups from here. Try again in an hour.",
  already_subscribed: "You already have a plan. Use Manage billing in Settings to change it.",
};

/** Create a Premium trial account from an email (ZIP is optional later) and open Stripe Checkout. */
export async function POST(request: Request) {
  await connection();
  const body = (await readFormOrJson<TrialBody>(request)) ?? {};
  const wantsJson = isJsonRequest(request);
  const origin = siteUrl(request);
  const attribution = readAttribution({ ref: body.ref, utm_source: body.utm_source });

  function fail(code: string, extra?: Record<string, unknown>) {
    if (wantsJson) {
      return json(
        { ok: false, message: ERROR_MESSAGES[code] || "That didn't work. Try again.", error: code, ...extra },
        ERROR_STATUS[code] || 400,
      );
    }
    const url = new URL("/start", origin);
    url.searchParams.set("trial", "1");
    url.searchParams.set("error", code);
    if (code === "exists") url.searchParams.set("mode", "signin");
    if (attribution.utmSource) url.searchParams.set("utm_source", attribution.utmSource);
    if (attribution.ref) url.searchParams.set("ref", attribution.ref);
    return Response.redirect(url, 303);
  }

  const email = cleanEmail(body.email);
  if (!email) return fail("invalid_email");

  if (!isTestEmail(email)) {
    recordTrackedEvent("trial_form_submit", { utm_source: attribution.utmSource, ref: attribution.ref });
  }

  if (!billingOpen()) return fail("billing_closed");

  if (!takeAuthRate(`signup:${clientKey(request)}`, 20)) return fail("rate_limit");

  let user = await sessionUser();
  if (user && user.email !== email) {
    // The typed email wins so someone can start a trial as themselves on a shared phone.
    user = null;
  }

  if (!user) {
    const already = userByEmail(email);
    if (already) {
      return fail("exists", { exists: true });
    }
    user = createUser({ email, zip: null, ownerId: await currentOwnerCookie(), billingOpen: billingOpen() });
    addSignup(email, null, { ...attribution, source: "trial" });
    if (!isTestEmail(email)) {
      recordTrackedEvent("trial_signup", { utm_source: attribution.utmSource, ref: attribution.ref });
    }
    await startSession(user.id);
  }

  if (user.subscription_status && ["active", "trialing", "past_due"].includes(user.subscription_status)) {
    return fail("already_subscribed");
  }

  try {
    const session = await createCheckoutSession({
      plan: "premium",
      founding: user.founding !== 0,
      userId: user.id,
      email: user.email,
      customerId: user.stripe_customer_id,
      siteUrl: origin,
      trialPeriodDays: TRIAL_DAYS,
      trafficSource: attribution.utmSource || attribution.ref || undefined,
    });
    if (!isTestEmail(user.email)) {
      recordUniqueTrackedEvent(`checkout_created:${session.id}`, "trial_checkout_created", {
        utm_source: attribution.utmSource,
        ref: attribution.ref,
      });
    }
    if (wantsJson) return json({ ok: true, url: session.url, user: toPublic(user) });
    return Response.redirect(session.url, 303);
  } catch (error) {
    console.error("trial checkout failed", error);
    if (!isTestEmail(user.email)) {
      recordTrackedEvent("trial_checkout_failed", { utm_source: attribution.utmSource, ref: attribution.ref });
    }
    return fail("checkout_failed");
  }
}
