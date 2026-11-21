export const PREMIUM_PRICE = 9.99;
export const PREMIUM_PRICE_LABEL = "$9.99";
export const HAND_PRICE = 19.99;
export const HAND_PRICE_LABEL = "$19.99";
export const FOUNDING_PREMIUM_LABEL = "$7.99";
export const FOUNDING_HAND_LABEL = "$14.99";

export const TRIAL_DAYS = 7;

/** Public trial price for new visitors. Founding members are charged the founding rate at checkout. */
export function trialPriceLabel(founding = false) {
  return founding ? FOUNDING_PREMIUM_LABEL : PREMIUM_PRICE_LABEL;
}

export function trialDisclosure(priceLabel: string) {
  return `7 days free, then ${priceLabel}/month. Cancel anytime before your trial ends and you won't be charged.`;
}

/** Short trial terms for the sign-up screen. Keep the longer disclosure on Stripe Checkout. */
export function trialDisclosureShort(priceLabel: string) {
  return `7 days free, then ${priceLabel}/month, cancel anytime.`;
}

export const TRIAL_CANCEL_HINT =
  "You can cancel in Settings under Manage billing, which opens Stripe's billing portal. Cancel before your trial ends and you won't be charged.";

export function foundingShareMessage(origin: string, shareCode: string) {
  const root = origin.replace(/\/$/, "");
  return `Founding Member: Premium is locked at ${FOUNDING_PREMIUM_LABEL}/mo for life (after launch ${PREMIUM_PRICE_LABEL}). Lend a Hand is locked at ${FOUNDING_HAND_LABEL}/mo for life (after launch ${HAND_PRICE_LABEL}). Join LifeSaver with my link: ${root}/?ref=${shareCode}`;
}

export type PaidPlan = "free" | "premium" | "hand";

export function includesPremium(plan: PaidPlan) {
  return plan === "premium" || plan === "hand";
}

type Feature = { title: string; body: string; soon?: boolean };

export const handIncludes: readonly Feature[] = [
  {
    title: "Everything in Premium",
    body: "Every deal, weather and travel alerts, the trip planner, and bill tools as they roll out.",
  },
  {
    title: "Ask for a hand",
    body: "A ride, yard work, moving help, a repair, or roadside help at your home or business.",
  },
  {
    title: "Nearby members respond",
    body: "Lend a Hand members near you see your request and can accept it. You agree on the price together.",
  },
  {
    title: "Earn by helping",
    body: "Helping is included. See nearby requests, accept one, and get paid by the person you help.",
  },
];

export const premiumIncludes: readonly Feature[] = [
  {
    title: "All local deals",
    body: "Cheapest gas, grocery price compare, and food deals near your ZIP.",
  },
  {
    title: "Weather, alerts, and trips",
    body: "What to wear today, National Weather Service alerts, and a day-by-day trip planner.",
  },
  {
    title: "Unlimited Ask LifeSaver",
    body: "Ask in plain words, or run LifeSaver from the AI you already use.",
  },
  {
    title: "Bill alerts, auto-cancel, and negotiation",
    body: "Price hikes, double charges, and forgotten trials on your own bills, once bank linking opens.",
    soon: true,
  },
  {
    title: "Savings goals",
    body: "Targets for the money you find, plus a history of what you kept.",
    soon: true,
  },
];

export const freeIncludes: readonly Feature[] = [
  {
    title: "Weekly $100 giveaway",
    body: "Free to enter, every week. No purchase necessary.",
  },
  {
    title: "Weather, alerts, grocery list, trip planner",
    body: "The everyday tools, free.",
  },
  {
    title: "A few deals",
    body: "A short daily taste of local prices.",
  },
];
