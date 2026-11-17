export const PREMIUM_PRICE = 9.99;
export const PREMIUM_PRICE_LABEL = "$9.99";

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
