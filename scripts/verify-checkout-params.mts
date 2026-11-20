import { checkoutSessionParams } from "../src/lib/stripe";

process.env.STRIPE_PRICE_PREMIUM = "price_premium_regular";
process.env.STRIPE_PRICE_PREMIUM_FOUNDING = "price_premium_founding";
process.env.STRIPE_PRICE_HAND = "price_hand_regular";
process.env.STRIPE_PRICE_HAND_FOUNDING = "price_hand_founding";

const regular = checkoutSessionParams({
  plan: "premium",
  founding: false,
  userId: "user_1",
  email: "alex@example.com",
  customerId: null,
  siteUrl: "https://golifesaver.com",
  trialPeriodDays: 7,
});

const founding = checkoutSessionParams({
  plan: "premium",
  founding: true,
  userId: "user_2",
  email: "founding@example.com",
  customerId: "cus_123",
  siteUrl: "https://golifesaver.com",
  trialPeriodDays: 7,
});

const noTrial = checkoutSessionParams({
  plan: "hand",
  founding: false,
  userId: "user_3",
  email: "hand@example.com",
  customerId: null,
  siteUrl: "https://golifesaver.com",
});

const checks: string[] = [];
function assert(cond: unknown, msg: string) {
  if (!cond) checks.push("FAIL: " + msg);
  else checks.push("ok: " + msg);
}

assert(regular.mode === "subscription", "subscription mode");
assert(regular["subscription_data[trial_period_days]"] === 7, "trial_period_days=7");
assert(regular.payment_method_collection === "always", "card collected up front");
assert(regular["line_items[0][price]"] === "price_premium_regular", "regular premium price id");
assert(
  regular["custom_text[submit][message]"] ===
    "7 days free, then $9.99/month. Cancel anytime before your trial ends and you won't be charged.",
  "regular disclosure wording",
);
assert(String(regular.success_url).includes("/home?checkout=success"), "trial success goes into the app");
assert(String(regular.cancel_url).includes("/start?trial=1"), "trial cancel returns to sign-up");
assert(regular.customer_email === "alex@example.com", "email when no customer id");

assert(founding["line_items[0][price]"] === "price_premium_founding", "founding premium price id");
assert(
  founding["custom_text[submit][message]"] ===
    "7 days free, then $7.99/month. Cancel anytime before your trial ends and you won't be charged.",
  "founding disclosure wording",
);
assert(founding.customer === "cus_123", "existing customer id is reused");
assert(!("customer_email" in founding) || founding.customer_email == null, "no email when customer id is set");

assert(noTrial["subscription_data[trial_period_days]"] === undefined, "no trial on Lend a Hand by default");
assert(noTrial.payment_method_collection === undefined, "no forced card collection without trial");
assert(String(noTrial.success_url).includes("/pricing?checkout=success"), "non-trial success stays on pricing");

const failed = checks.filter((line) => line.startsWith("FAIL"));
console.log(checks.join("\n"));
if (failed.length) {
  console.error(`\n${failed.length} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checkout param checks passed");
