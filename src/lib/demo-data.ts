export const DEMO_AS_OF = "November 17, 2026";
export const MONTH_SAVED = 186.4;

export const institutions = [
  {
    id: "chase",
    name: "Chase",
    detail: "Total Checking ··4291",
    kind: "Bank",
  },
  {
    id: "capitalone",
    name: "Capital One",
    detail: "Savor card ··8814",
    kind: "Card",
  },
  {
    id: "wellsfargo",
    name: "Wells Fargo",
    detail: "Everyday Checking ··2206",
    kind: "Bank",
  },
  {
    id: "pge",
    name: "PG&E",
    detail: "Electric account",
    kind: "Bill",
  },
  {
    id: "verizon",
    name: "Verizon",
    detail: "Wireless ··0144",
    kind: "Bill",
  },
] as const;

export type InstitutionId = (typeof institutions)[number]["id"];

export type FlagId =
  | "price-hike"
  | "duplicate"
  | "trial"
  | "unused"
  | "negotiable";

export type BillActionKind = "cancel" | "negotiate" | "remind";

export type Bill = {
  id: string;
  name: string;
  category: string;
  amount: number;
  amountNote?: string;
  renewsLabel: string;
  renewsOn: string;
  lastUsed: string;
  flags: FlagId[];
  note?: string;
  actions: BillActionKind[];
};

export const flagLabel: Record<FlagId, string> = {
  "price-hike": "Price hike",
  duplicate: "Duplicate charge",
  trial: "Trial ending",
  unused: "Unused",
  negotiable: "Negotiable",
};

export const bills: Bill[] = [
  {
    id: "nyt",
    name: "NYT Games",
    category: "Subscription",
    amount: 0,
    amountNote: "then $6.00/mo",
    renewsLabel: "Trial ends Nov 19",
    renewsOn: "2026-11-19",
    lastUsed: "Nov 10",
    flags: ["trial"],
    note: "Free trial ends Thursday, then $6.00 a month. Easy to forget.",
    actions: ["cancel", "remind"],
  },
  {
    id: "pge",
    name: "PG&E Electric",
    category: "Bill",
    amount: 86.4,
    renewsLabel: "Due Nov 21",
    renewsOn: "2026-11-21",
    lastUsed: "Monthly bill",
    flags: [],
    note: "November statement. Not a subscription — just due soon.",
    actions: ["remind"],
  },
  {
    id: "adobe",
    name: "Adobe Creative Cloud",
    category: "Subscription",
    amount: 59.99,
    renewsLabel: "Renews Nov 22",
    renewsOn: "2026-11-22",
    lastUsed: "Today",
    flags: ["price-hike", "negotiable"],
    note: "Was $54.99. The new price is $59.99 — $60 more over a year.",
    actions: ["cancel", "negotiate", "remind"],
  },
  {
    id: "chatgpt",
    name: "ChatGPT Plus",
    category: "Subscription",
    amount: 20,
    renewsLabel: "Renews Nov 25",
    renewsOn: "2026-11-25",
    lastUsed: "Today",
    flags: [],
    actions: ["cancel", "remind"],
  },
  {
    id: "verizon",
    name: "Verizon Wireless",
    category: "Bill",
    amount: 85,
    renewsLabel: "Due Nov 27",
    renewsOn: "2026-11-27",
    lastUsed: "Active line",
    flags: ["negotiable"],
    note: "A loyalty discount is often available on a line this old.",
    actions: ["negotiate", "remind"],
  },
  {
    id: "spotify",
    name: "Spotify",
    category: "Subscription",
    amount: 11.99,
    renewsLabel: "Renews Nov 28",
    renewsOn: "2026-11-28",
    lastUsed: "Nov 15",
    flags: [],
    actions: ["cancel", "remind"],
  },
  {
    id: "hulu",
    name: "Hulu",
    category: "Subscription",
    amount: 18.99,
    renewsLabel: "Renews Nov 30",
    renewsOn: "2026-11-30",
    lastUsed: "Nov 14",
    flags: ["duplicate"],
    note: "Charged $18.99 on Nov 10 and again on Nov 12.",
    actions: ["cancel", "remind"],
  },
  {
    id: "planet",
    name: "Planet Fitness",
    category: "Membership",
    amount: 24.99,
    renewsLabel: "Renews Dec 1",
    renewsOn: "2026-12-01",
    lastUsed: "Oct 2 · 46 days ago",
    flags: ["unused"],
    note: "No club check-in since October 2.",
    actions: ["cancel", "remind"],
  },
  {
    id: "netflix",
    name: "Netflix",
    category: "Subscription",
    amount: 15.49,
    renewsLabel: "Renews Dec 2",
    renewsOn: "2026-12-02",
    lastUsed: "Yesterday",
    flags: [],
    actions: ["cancel", "remind"],
  },
  {
    id: "xfinity",
    name: "Xfinity Internet",
    category: "Bill",
    amount: 89.99,
    renewsLabel: "Renews Dec 3",
    renewsOn: "2026-12-03",
    lastUsed: "Always on",
    flags: ["negotiable"],
    note: "Promo rate ended in September. Competitors nearby advertise less.",
    actions: ["negotiate", "remind"],
  },
  {
    id: "icloud",
    name: "iCloud+",
    category: "Subscription",
    amount: 2.99,
    renewsLabel: "Renews Dec 5",
    renewsOn: "2026-12-05",
    lastUsed: "Today",
    flags: [],
    actions: ["remind"],
  },
];

export const alerts = [
  {
    id: "adobe-hike",
    billId: "adobe",
    kicker: "Price hike detected",
    title: "Adobe went up $5",
    body: "Creative Cloud moved from $54.99 to $59.99. That's $60 over a year if it sticks.",
  },
  {
    id: "hulu-dup",
    billId: "hulu",
    kicker: "Duplicate charge",
    title: "Hulu billed you twice",
    body: "$18.99 posted on Nov 10 and again on Nov 12. One of those looks like a double charge.",
  },
  {
    id: "nyt-trial",
    billId: "nyt",
    kicker: "Forgotten free trial",
    title: "NYT Games ends Thursday",
    body: "The trial converts to $6.00 a month on Nov 19 unless you stop it.",
  },
  {
    id: "planet-unused",
    billId: "planet",
    kicker: "Unused subscription",
    title: "Planet Fitness is idle",
    body: "No visits in 46 days. The membership is $19.99 a month.",
  },
] as const;

export const ledger = [
  { label: "Grocery deals used", amount: 62.4 },
  { label: "Food deals used", amount: 41 },
  { label: "Gas below the neighborhood average", amount: 28 },
  { label: "Trial cancelled before it billed", amount: 36 },
  { label: "Duplicate charge refunded", amount: 19 },
] as const;

export const savingsHistory = [
  { month: "Jun", amount: 42 },
  { month: "Jul", amount: 71 },
  { month: "Aug", amount: 96 },
  { month: "Sep", amount: 118 },
  { month: "Oct", amount: 154 },
  { month: "Nov", amount: MONTH_SAVED },
] as const;

export const YEAR_SAVED = savingsHistory.reduce((sum, month) => sum + month.amount, 0);

export const goals = [
  {
    id: "unused",
    name: "Drop unused memberships",
    saved: 24.99,
    target: 50,
    detail: "Planet Fitness is the idle one in this sample.",
  },
  {
    id: "grocery",
    name: "Grocery deals this month",
    saved: 62.4,
    target: 80,
    detail: "From the sample basket, not a live receipt.",
  },
  {
    id: "buffer",
    name: "Found-money buffer",
    saved: MONTH_SAVED,
    target: 500,
    detail: "A calm cushion made of money you kept.",
  },
] as const;

export type DealCategory = "gas" | "grocery" | "food";

export type Deal = {
  id: string;
  category: DealCategory;
  merchant: string;
  title: string;
  priceLabel: string;
  wasLabel?: string;
  savingsLabel: string;
  distance: string;
  address: string;
  tier: "free" | "premium";
  highlight?: string;
  detail: string;
};

export const dealCategories: { id: "all" | DealCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "gas", label: "Gas" },
  { id: "grocery", label: "Groceries" },
  { id: "food", label: "Food" },
];

export const deals: Deal[] = [
  {
    id: "costco-gas",
    category: "gas",
    merchant: "Costco Gasoline",
    title: "Regular unleaded",
    priceLabel: "$4.19/gal",
    wasLabel: "Area avg $4.65",
    savingsLabel: "Save $0.46/gal",
    distance: "1.6 mi",
    address: "450 10th St, San Francisco",
    tier: "free",
    highlight: "Cheapest gas nearby",
    detail:
      "Lowest price in this sample set. A 12-gallon fill is about $5.52 under the neighborhood average.",
  },
  {
    id: "arco",
    category: "gas",
    merchant: "Arco",
    title: "Regular unleaded",
    priceLabel: "$4.39/gal",
    wasLabel: "Area avg $4.65",
    savingsLabel: "Save $0.26/gal",
    distance: "0.4 mi",
    address: "3598 Mission St, San Francisco",
    tier: "premium",
    detail: "Closer than Costco, a bit more per gallon. Pay inside for the posted cash price.",
  },
  {
    id: "76",
    category: "gas",
    merchant: "76",
    title: "Regular unleaded",
    priceLabel: "$4.59/gal",
    wasLabel: "Area avg $4.65",
    savingsLabel: "Save $0.06/gal",
    distance: "0.8 mi",
    address: "2600 Bryant St, San Francisco",
    tier: "premium",
    detail: "Only a few cents under average. Useful if the cheaper stations have a line.",
  },
  {
    id: "chevron",
    category: "gas",
    merchant: "Chevron",
    title: "Regular unleaded",
    priceLabel: "$4.89/gal",
    wasLabel: "Area avg $4.65",
    savingsLabel: "$0.24 over avg",
    distance: "0.3 mi",
    address: "2700 Mission St, San Francisco",
    tier: "premium",
    detail: "Closest station in the sample, and the most expensive. Shown so the cheap option is obvious.",
  },
  {
    id: "outlet-eggs",
    category: "grocery",
    merchant: "Grocery Outlet",
    title: "Large eggs, dozen",
    priceLabel: "$3.49",
    wasLabel: "Was $5.99",
    savingsLabel: "Save $2.50",
    distance: "0.9 mi",
    address: "1765 Mission St, San Francisco",
    tier: "free",
    highlight: "Best grocery save",
    detail: "Sample weekly ad price. The live app would pull this from a grocery flyer or retailer API.",
  },
  {
    id: "tj-berries",
    category: "grocery",
    merchant: "Trader Joe's",
    title: "Organic blueberries, 6 oz",
    priceLabel: "$2.99",
    wasLabel: "Was $3.99",
    savingsLabel: "Save $1.00",
    distance: "0.6 mi",
    address: "3250 16th St, San Francisco",
    tier: "premium",
    detail: "A small save, close by. Good add-on if you're already on 16th.",
  },
  {
    id: "safeway-chicken",
    category: "grocery",
    merchant: "Safeway",
    title: "Chicken thighs",
    priceLabel: "$2.49/lb",
    wasLabel: "Was $3.99/lb",
    savingsLabel: "Save $1.50/lb",
    distance: "0.8 mi",
    address: "2020 Market St, San Francisco",
    tier: "premium",
    detail: "Club price in this sample. Two pounds is about $3.00 under the regular tag.",
  },
  {
    id: "birite-bread",
    category: "grocery",
    merchant: "Bi-Rite Market",
    title: "Day-old sourdough",
    priceLabel: "$4.50",
    wasLabel: "Was $6.50",
    savingsLabel: "Save $2.00",
    distance: "0.7 mi",
    address: "3639 18th St, San Francisco",
    tier: "premium",
    detail: "Afternoon markdown. Sample only — the real loaf count changes by the hour.",
  },
  {
    id: "farolito",
    category: "food",
    merchant: "Taqueria El Farolito",
    title: "Super burrito after 3pm",
    priceLabel: "$10.00",
    wasLabel: "Usually $13.50",
    savingsLabel: "Save $3.50",
    distance: "0.5 mi",
    address: "2779 Mission St, San Francisco",
    tier: "free",
    highlight: "Closest meal deal",
    detail: "Late-afternoon special in this sample. Not a coupon code — just a posted window.",
  },
  {
    id: "burma",
    category: "food",
    merchant: "Burma Love",
    title: "Weekday lunch set",
    priceLabel: "$12.00",
    wasLabel: "Usually $18.00",
    savingsLabel: "Save $6.00",
    distance: "0.8 mi",
    address: "211 Valencia St, San Francisco",
    tier: "premium",
    detail: "Tea leaf salad and a main, sample lunch price. Ends at 3pm in this demo.",
  },
  {
    id: "tartine",
    category: "food",
    merchant: "Tartine Manufactory",
    title: "Pastry bag",
    priceLabel: "$6.00",
    wasLabel: "Usually $14.00",
    savingsLabel: "Save $8.00",
    distance: "1.0 mi",
    address: "595 Alabama St, San Francisco",
    tier: "premium",
    detail: "End-of-day bag. Sample contents: two pastries. Real availability would come from the shop.",
  },
  {
    id: "arizmendi",
    category: "food",
    merchant: "Arizmendi Bakery",
    title: "Slice and salad",
    priceLabel: "$7.00",
    wasLabel: "Usually $12.00",
    savingsLabel: "Save $5.00",
    distance: "1.2 mi",
    address: "1331 9th Ave, San Francisco",
    tier: "premium",
    detail: "Today's pizza is roasted potato and rosemary in this sample. Cooperative bakery, posted combo.",
  },
];

const ledgerSum = ledger.reduce((sum, row) => sum + row.amount, 0);
if (Math.abs(ledgerSum - MONTH_SAVED) > 0.02) {
  throw new Error("Sample savings ledger does not match the monthly total.");
}
