/** Get a Hand request types shared by the server and the browser. */

export const PRO_CATEGORIES = [
  { id: "plumber", label: "Plumber", emoji: "🚰", search: "plumber" },
  { id: "electrician", label: "Electrician", emoji: "💡", search: "electrician" },
  { id: "hvac", label: "Heating & AC", emoji: "❄️", search: "HVAC repair" },
  { id: "handyman", label: "Handyman", emoji: "🔨", search: "handyman" },
  { id: "roofing", label: "Roofing", emoji: "🏠", search: "roofing contractor" },
  { id: "cleaning", label: "Cleaning", emoji: "🧽", search: "house cleaning service" },
  { id: "lawn_snow", label: "Lawn / snow", emoji: "🌱", search: "lawn care snow removal" },
  { id: "moving", label: "Moving", emoji: "📦", search: "movers" },
  { id: "pest", label: "Pest control", emoji: "🐜", search: "pest control" },
  { id: "locksmith", label: "Locksmith", emoji: "🔑", search: "locksmith" },
  { id: "auto_mechanic", label: "Auto mechanic", emoji: "🔧", search: "auto repair" },
  { id: "other", label: "Other", emoji: "✨", search: "home services" },
] as const;

export type ProCategory = (typeof PRO_CATEGORIES)[number]["id"];

export const URGENCY = [
  { id: "now", label: "Right now" },
  { id: "today", label: "Today" },
  { id: "this_week", label: "This week" },
  { id: "flexible", label: "Flexible" },
] as const;

export const HELP_DISCLAIMER =
  "Helpers are LifeSaver community members. They are not vetted, licensed, insured, or employed by LifeSaver, and nobody is guaranteed to respond. For licensed work (electrical, plumbing, gas, HVAC, roofing, structural) hire a licensed pro.";

export function proCategory(id: string) {
  return PRO_CATEGORIES.find((c) => c.id === id) ?? PRO_CATEGORIES[PRO_CATEGORIES.length - 1];
}

/** Ask LifeSaver intent: a pro category from a chat message, or null. */
export function detectPro(text: string): ProCategory | null {
  const t = text.toLowerCase();
  const rules: [RegExp, ProCategory][] = [
    [/\bplumb(er|ing)\b|\bleak(ing|y)? (pipe|faucet|sink|toilet)|\bclogged\b|\bwater heater\b/, "plumber"],
    [/\belectric(ian|al)\b|\boutlet\b|\bbreaker\b|\bwiring\b/, "electrician"],
    [/\bhvac\b|\bfurnace\b|\bheat(er|ing) (is )?(out|broke|not working)|\b(a\/c|air condition(er|ing))\b|\bmy ac\b/, "hvac"],
    [/\bhandyman\b/, "handyman"],
    [/\broof(er|ing)?\b/, "roofing"],
    [/\bhouse ?clean(er|ers|ing)\b|\bcleaning service\b|\bmaid\b/, "cleaning"],
    [/\blawn (care|service|mowing)\b|\bmow (my|the) (lawn|yard|grass)\b|\bsnow (removal|plow(ing)?|shovel(ing)?)\b|\bshovel (my|the) (driveway|walk)\b/, "lawn_snow"],
    [/\bmovers\b|\bmoving (help|company)\b|\bhelp (me )?mov(e|ing)\b/, "moving"],
    [/\bpest\b|\bexterminator\b|\btermites?\b|\broaches\b|\bbed ?bugs\b/, "pest"],
    [/\blocksmith\b|\blocked out of (my|the) (house|home|apartment)\b/, "locksmith"],
    [/\bmechanic\b|\bcar repair\b|\bcheck engine\b/, "auto_mechanic"],
  ];
  for (const [re, id] of rules) if (re.test(t)) return id;
  return null;
}

/** Ask LifeSaver intent: "I need a ride to the airport" -> dropoff text, or null. */
export function detectRide(text: string): { dropoff: string } | null {
  const m = text.match(/\b(?:need|want|get|give me|find me|looking for)\s+(?:a\s+)?(?:ride|lift|pickup)(?:\s+(?:to|over to|down to)\s+(.{2,80}?))?\s*(?:[.?!]|$)/i);
  if (!m) return null;
  return { dropoff: (m[1] ?? "").replace(/\s+(today|tonight|tomorrow|now|asap|please)$/i, "").trim() };
}
