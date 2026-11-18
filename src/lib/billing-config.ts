/**
 * Stripe billing switches on only when every key is set on the server:
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 *   STRIPE_PRICE_PREMIUM_FOUNDING, STRIPE_PRICE_PREMIUM,
 *   STRIPE_PRICE_HAND_FOUNDING, STRIPE_PRICE_HAND
 * Until then, plan buttons save founding-rate interest and nothing is charged.
 */
export type BillingPlan = "premium" | "hand";

export function stripeSecret() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

export function priceIdFor(plan: BillingPlan, founding: boolean) {
  const key =
    plan === "premium"
      ? founding
        ? "STRIPE_PRICE_PREMIUM_FOUNDING"
        : "STRIPE_PRICE_PREMIUM"
      : founding
        ? "STRIPE_PRICE_HAND_FOUNDING"
        : "STRIPE_PRICE_HAND";
  return process.env[key]?.trim() || "";
}

export function billingOpen() {
  return Boolean(
    stripeSecret() &&
      process.env.STRIPE_WEBHOOK_SECRET?.trim() &&
      priceIdFor("premium", true) &&
      priceIdFor("premium", false) &&
      priceIdFor("hand", true) &&
      priceIdFor("hand", false),
  );
}
