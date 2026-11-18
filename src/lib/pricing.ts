export const PREMIUM_PRICE = 9.99;
export const PREMIUM_PRICE_LABEL = "$9.99";
export const HAND_PRICE = 24.99;
export const HAND_PRICE_LABEL = "$24.99";
/** Helper plan: for people who earn money accepting Lend a Hand and roadside requests. */
export const HELPER_PRICE = 50;
export const HELPER_PRICE_LABEL = "$50.00";
export const FOUNDING_PREMIUM_LABEL = "$7.99";
export const FOUNDING_HAND_LABEL = "$20.00";

export function foundingShareMessage(origin: string, shareCode: string) {
  const root = origin.replace(/\/$/, "");
  return `Founding Member: Premium is locked at ${FOUNDING_PREMIUM_LABEL}/mo for life (after launch ${PREMIUM_PRICE_LABEL}). Lend a Hand is locked at ${FOUNDING_HAND_LABEL}/mo for life (after launch ${HAND_PRICE_LABEL}). Join LifeSaver with my link: ${root}/?ref=${shareCode}`;
}

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

export const helperIncludes = [
  {
    title: "Earn helping neighbors",
    body: "See nearby Lend a Hand requests, like yard work, moving, and errands, and send your price.",
  },
  {
    title: "Accept requests",
    body: "An active Helper plan is required to accept Lend a Hand and roadside requests.",
  },
  {
    title: "Your helper profile",
    body: "Skills, area, and ratings from the people you help.",
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
