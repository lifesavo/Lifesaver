export const PREMIUM_PRICE = 9.99;
export const PREMIUM_PRICE_LABEL = "$9.99";
export const HAND_PRICE = 29.99;
export const HAND_PRICE_LABEL = "$29.99";

export type PaidPlan = "free" | "premium" | "hand";

export function includesPremium(plan: PaidPlan) {
  return plan === "premium" || plan === "hand";
}

export const handIncludes = [
  {
    title: "Everything in Premium",
    body: "Auto-cancel, negotiation, instant alerts, every deal, and savings goals.",
  },
  {
    title: "Post an odd job",
    body: "Yard work, moving help, assembly, cleanup, or an errand around home or a business.",
  },
  {
    title: "Helper offers",
    body: "Nearby vetted helpers send a price. You pick one. Sample people in this demo.",
  },
  {
    title: "Book and confirm",
    body: "A booking stays on the task. The live network can later plug into Work For All.",
  },
] as const;

export const premiumIncludes = [
  {
    title: "Auto-cancel",
    body: "We ask the company to cancel, then check with you before anything is final.",
  },
  {
    title: "Bill negotiation",
    body: "We request a lower rate on internet, wireless, and other negotiable bills.",
  },
  {
    title: "Instant alerts",
    body: "Price hikes, duplicate charges, forgotten trials, and unused subscriptions.",
  },
  {
    title: "All local deals",
    body: "Cheapest gas, grocery specials, and food deals near your ZIP — the full list.",
  },
  {
    title: "Savings goals",
    body: "Targets for the money you find, plus a history of what you already kept.",
  },
] as const;

export const freeIncludes = [
  {
    title: "Track bills",
    body: "Amounts, renewal dates, and when you last used a subscription.",
  },
  {
    title: "A few deals",
    body: "A short daily taste of local prices. Not the full board.",
  },
  {
    title: "Manual reminders",
    body: "Set your own nudge before a renewal. We won't chase the company for you.",
  },
] as const;
