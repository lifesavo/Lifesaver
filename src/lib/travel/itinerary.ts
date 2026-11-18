/**
 * Rule-based trip planner. Pure TypeScript so it runs on the server and in the browser.
 * No live prices: every dollar figure here is a suggested budget split, labeled as an estimate.
 */

export type Interest = "food" | "music" | "nightlife" | "outdoors" | "museums" | "family" | "shopping" | "beach" | "romance" | "sports";

export const INTERESTS: { id: Interest; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "music", label: "Music" },
  { id: "nightlife", label: "Nightlife" },
  { id: "outdoors", label: "Outdoors" },
  { id: "museums", label: "Museums" },
  { id: "family", label: "Kids & family" },
  { id: "shopping", label: "Shopping" },
  { id: "beach", label: "Beach" },
  { id: "romance", label: "Date trip" },
  { id: "sports", label: "Sports" },
];

export type PlanInput = {
  destination: string;
  origin: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  travelers: number;
  budget: number | null; // total USD for the whole group
  interests: Interest[];
};

export type Slot = { time: "morning" | "afternoon" | "evening"; start: string; end: string; title: string; detail: string; href?: string };

export type PlanDay = { date: string; label: string; theme: string; slots: Slot[] };

export type BudgetLine = { id: "travel" | "stay" | "food" | "activities"; label: string; amount: number; note: string };

export type PlanLink = { label: string; detail: string; href: string };

export type Itinerary = {
  id: string;
  createdAt: string;
  input: PlanInput;
  title: string;
  nights: number;
  days: PlanDay[];
  budget: BudgetLine[] | null;
  budgetNote: string;
  packing: string[];
  links: PlanLink[];
  notes: string[];
  enriched: boolean;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromIso(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

function addDays(value: string, n: number) {
  const d = fromIso(value);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function daysBetween(a: string, b: string) {
  return Math.round((fromIso(b).getTime() - fromIso(a).getTime()) / 86400000);
}

function titleCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/\b(Dc|Nyc|Usa)\b/g, (c) => c.toUpperCase())
    .replace(/([ ,])([A-Z][a-z])$/, (whole, sep: string, code: string) => (STATES.has(code.toUpperCase()) ? `${sep}${code.toUpperCase()}` : whole));
}

const STATES = new Set("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split(" "));

/** Next occurrence of month/day on or after today. */
function nextDate(month: number, day: number, today: Date, year?: number) {
  let y = year ?? today.getFullYear();
  let d = new Date(y, month, day, 12);
  if (!year && d.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
    y += 1;
    d = new Date(y, month, day, 12);
  }
  return isoDate(d);
}

const INTEREST_WORDS: Record<Interest, RegExp> = {
  food: /\b(food|eat|restaurant|bbq|foodie|brunch|dinner)\b/,
  music: /\b(music|concert|live music|honky|jazz|blues|country)\b/,
  nightlife: /\b(nightlife|bar|bars|club|party|drinks|bachelor|bachelorette)\b/,
  outdoors: /\b(outdoor|outdoors|hike|hiking|park|nature|trail|camping|lake|mountain)\b/,
  museums: /\b(museum|museums|history|art|culture|gallery)\b/,
  family: /\b(kid|kids|family|children|zoo|aquarium)\b/,
  shopping: /\b(shop|shopping|mall|outlet)\b/,
  beach: /\b(beach|ocean|swim|island)\b/,
  romance: /\b(romantic|anniversary|honeymoon|date|couple)\b/,
  sports: /\b(game|sports|football|baseball|basketball|hockey|golf)\b/,
};

export type ParsedRequest = Partial<PlanInput> & { missing: string[]; assumedDates?: boolean };

/** Pulls destination, dates, travelers, budget, and interests out of a sentence. */
export function parseTripRequest(text: string, today = new Date()): ParsedRequest {
  const raw = ` ${text.replace(/\s+/g, " ")} `;
  const lower = raw.toLowerCase();
  const out: ParsedRequest = { missing: [] };

  // Budget: "$800", "800 dollars", "budget of 1,200"
  const money = lower.match(/\$\s?(\d[\d,]*(?:\.\d+)?)\s*(k)?/) ?? lower.match(/\b(\d[\d,]{2,})\s*(k)?\s*(?:dollars|bucks|budget)\b/) ?? lower.match(/budget (?:of |is )?(\d[\d,]*)\s*(k)?/);
  if (money) {
    const n = Number(money[1].replace(/,/g, "")) * (money[2] ? 1000 : 1);
    if (Number.isFinite(n) && n > 0) out.budget = Math.round(n);
  }

  // Travelers
  const people =
    lower.match(/\bfor (\d{1,2})\b(?! ?(?:days?|nights?))/) ??
    lower.match(/\b(\d{1,2}) ?(?:people|persons|adults|travelers|of us|guests)\b/) ??
    lower.match(/\bfamily of (\d{1,2})\b/);
  if (people) out.travelers = Math.min(12, Math.max(1, Number(people[1])));
  else if (/\b(couple|my (wife|husband|girlfriend|boyfriend|partner)|two of us|anniversary|honeymoon)\b/.test(lower)) out.travelers = 2;
  else if (/\b(solo|by myself|just me)\b/.test(lower)) out.travelers = 1;

  // Dates
  const iso = [...lower.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map((m) => m[1]);
  const monthRe = "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
  const range = lower.match(new RegExp(`${monthRe} (\\d{1,2})(?:st|nd|rd|th)?(?:,? (\\d{4}))?\\s*(?:-|–|to|through|thru|until)\\s*(?:${monthRe} )?(\\d{1,2})(?:st|nd|rd|th)?(?:,? (\\d{4}))?`));
  const single = lower.match(new RegExp(`${monthRe} (\\d{1,2})(?:st|nd|rd|th)?(?:,? (\\d{4}))?`));
  const slash = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?:-|–|to|through)\s*(?:(\d{1,2})\/)?(\d{1,2})(?:\/(\d{2,4}))?\b/);
  const lengthMatch = lower.match(/\b(\d{1,2}|a|one|two|three|four|five|six|seven)[ -](day|night)s?\b/) ?? lower.match(/\b(weekend|week)\b/);
  const words: Record<string, number> = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
  let length: number | null = null;
  if (lengthMatch) {
    if (lengthMatch[1] === "weekend") length = 3;
    else if (lengthMatch[1] === "week") length = 7;
    else {
      const n = words[lengthMatch[1]] ?? Number(lengthMatch[1]);
      length = lengthMatch[2] === "night" ? n + 1 : n;
    }
  }

  if (iso.length >= 2) {
    out.start = iso[0];
    out.end = iso[1];
  } else if (range) {
    const m1 = MONTHS.indexOf(range[1].slice(0, 3));
    const m2 = range[4] ? MONTHS.indexOf(range[4].slice(0, 3)) : m1;
    const year = range[3] ? Number(range[3]) : range[6] ? Number(range[6]) : undefined;
    out.start = nextDate(m1, Number(range[2]), today, year);
    const startYear = Number(out.start.slice(0, 4));
    out.end = nextDate(m2, Number(range[5]), today, m2 < m1 ? startYear + 1 : startYear);
  } else if (slash) {
    const year = slash[3] ? Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]) : undefined;
    out.start = nextDate(Number(slash[1]) - 1, Number(slash[2]), today, year);
    const m2 = slash[4] ? Number(slash[4]) - 1 : Number(slash[1]) - 1;
    out.end = nextDate(m2, Number(slash[5]), today, Number(out.start.slice(0, 4)) + (m2 < Number(slash[1]) - 1 ? 1 : 0));
  } else if (iso.length === 1 || single) {
    out.start = iso[0] ?? nextDate(MONTHS.indexOf(single![1].slice(0, 3)), Number(single![2]), today, single![3] ? Number(single![3]) : undefined);
    out.end = addDays(out.start, (length ?? 3) - 1);
  } else if (/\bthis weekend\b|\bweekend\b/.test(lower)) {
    const d = new Date(today);
    const toFri = (5 - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + toFri);
    out.start = isoDate(d);
    out.end = addDays(out.start, 2);
  } else if (/\bnext week\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
    out.start = isoDate(d);
    out.end = addDays(out.start, (length ?? 3) - 1);
  } else if (length) {
    // Length only: start two weeks out so there is time to book.
    const d = new Date(today);
    d.setDate(d.getDate() + 14);
    out.start = isoDate(d);
    out.end = addDays(out.start, length - 1);
    out.assumedDates = true;
  }
  if (out.start && out.end && out.end < out.start) out.end = out.start;

  // Origin
  const from = raw.match(/\bfrom ([A-Za-z][A-Za-z .'-]{1,30}?)(?=\s+(?:to|on|for|in|from|with|under|and|leaving|departing|starting|returning|this|next|around|over|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov)\b|[,.!?]|\s*\$|\s*$)/i);
  if (from && !/^\d/.test(from[1])) out.origin = titleCase(from[1]);

  // Destination
  const stop = "(?=\\s+(?:from|on|for|in|with|under|and|this|next|leaving|departing|starting|returning|over|around|between|during|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\\b|\\s+\\d|[,.!?]|\\s*\\$|\\s*$)";
  const dest =
    raw.match(new RegExp(`\\b(?:trip|vacation|getaway|weekend|itinerary|travel|go|going|visit|visiting|fly|flying|drive|driving|heading|head)\\s+(?:to|in|for)\\s+([A-Za-z][A-Za-z .'-]{1,34}?)${stop}`, "i")) ??
    raw.match(new RegExp(`\\bto\\s+([A-Z][A-Za-z .'-]{1,34}?)${stop}`)) ??
    raw.match(new RegExp(`\\bto\\s+([A-Za-z][A-Za-z .'-]{1,34}?)${stop}`, "i")) ??
    raw.match(new RegExp(`\\bin\\s+([A-Z][A-Za-z .'-]{1,34}?)${stop}`));
  if (dest) {
    const cleaned = dest[1].replace(/\b(the|a)\s+/gi, "").trim();
    if (cleaned.length >= 2 && !/^(me|us|go|do|see|plan|be)$/i.test(cleaned)) out.destination = titleCase(cleaned);
  }

  const interests = (Object.keys(INTEREST_WORDS) as Interest[]).filter((id) => INTEREST_WORDS[id].test(lower));
  if (interests.length) out.interests = interests;

  if (!out.destination) out.missing.push("destination");
  if (!out.start) out.missing.push("dates");
  return out;
}

export function normalizeInput(input: Partial<PlanInput>): PlanInput | string {
  const destination = (input.destination ?? "").trim().slice(0, 60);
  if (destination.length < 2) return "Tell me where you want to go.";
  const start = (input.start ?? "").trim();
  let end = (input.end ?? "").trim();
  if (!DATE.test(start)) return "Pick a start date.";
  if (!DATE.test(end)) end = start;
  if (end < start) return "The end date has to be on or after the start date.";
  if (daysBetween(start, end) > 13) return "Plans can be up to 14 days. Split a longer trip into two plans.";
  const travelers = Math.round(Number(input.travelers ?? 1));
  const budget = input.budget == null || input.budget === ("" as unknown) ? null : Math.round(Number(input.budget));
  const interests = Array.isArray(input.interests) ? input.interests.filter((i): i is Interest => INTERESTS.some((x) => x.id === i)) : [];
  return {
    destination,
    origin: (input.origin ?? "").trim().slice(0, 60),
    start,
    end,
    travelers: Number.isFinite(travelers) && travelers >= 1 ? Math.min(12, travelers) : 1,
    budget: budget != null && Number.isFinite(budget) && budget > 0 ? Math.min(1_000_000, budget) : null,
    interests: [...new Set(interests)].slice(0, 6),
  };
}

/** A few well-known highlights. Anything not listed gets search-based suggestions. */
const HIGHLIGHTS: Record<string, string[]> = {
  nashville: ["Walk Broadway's honky-tonks", "Tour the Ryman Auditorium", "Country Music Hall of Fame", "Hot chicken for lunch", "Grand Ole Opry show", "The Gulch and 12 South murals", "Centennial Park and the Parthenon"],
  "new york": ["Central Park", "Walk the Brooklyn Bridge", "Top of the Rock or Empire State views", "The High Line and Chelsea Market", "The Met", "Times Square at night", "Statue of Liberty ferry"],
  chicago: ["Millennium Park and the Bean", "Architecture river cruise", "Art Institute of Chicago", "Deep-dish pizza", "Navy Pier", "Wrigleyville", "Lakefront Trail"],
  "las vegas": ["Walk the Strip at night", "Bellagio fountains", "Fremont Street", "Red Rock Canyon", "A show on the Strip", "High Roller wheel"],
  orlando: ["A theme park day", "Disney Springs", "ICON Park", "Lake Eola Park", "Kennedy Space Center day trip"],
  "kansas city": ["Kansas City BBQ", "Country Club Plaza", "National WWI Museum and Memorial", "18th & Vine Jazz District", "Nelson-Atkins Museum of Art", "Power & Light District"],
  "st. louis": ["Gateway Arch", "Forest Park", "City Museum", "St. Louis Zoo", "The Hill for Italian food"],
  "st louis": ["Gateway Arch", "Forest Park", "City Museum", "St. Louis Zoo", "The Hill for Italian food"],
  branson: ["Branson Landing", "A live show on 76 Country Blvd", "Silver Dollar City", "Table Rock Lake", "Dogwood Canyon"],
  "new orleans": ["French Quarter", "Beignets at Café du Monde", "Frenchmen Street live music", "Garden District", "Steamboat on the Mississippi"],
  miami: ["South Beach", "Wynwood Walls", "Little Havana", "Bayside Marketplace", "Key Biscayne"],
  denver: ["Red Rocks Amphitheatre", "Union Station and LoDo", "Denver Botanic Gardens", "16th Street Mall", "Day trip to the mountains"],
  dallas: ["Dealey Plaza and the Sixth Floor Museum", "Deep Ellum", "Klyde Warren Park", "Bishop Arts District", "Fort Worth Stockyards day trip"],
  atlanta: ["Georgia Aquarium", "World of Coca-Cola", "BeltLine walk", "Ponce City Market", "Centennial Olympic Park"],
  "san antonio": ["River Walk", "The Alamo", "Pearl District", "Mission San José"],
  memphis: ["Beale Street", "Graceland", "National Civil Rights Museum", "Memphis BBQ"],
  "los angeles": ["Santa Monica Pier", "Griffith Observatory", "Hollywood Walk of Fame", "The Getty", "Venice Beach"],
  "san diego": ["Balboa Park", "La Jolla Cove", "Gaslamp Quarter", "San Diego Zoo", "Coronado Beach"],
  "washington": ["National Mall monuments", "Smithsonian museums", "Capitol and Library of Congress", "Georgetown waterfront"],
  "gatlinburg": ["Great Smoky Mountains hike", "Gatlinburg Parkway", "Anakeesta", "Pigeon Forge day"],
};

function highlightsFor(destination: string) {
  const key = destination.toLowerCase().replace(/,.*$/, "").trim();
  return HIGHLIGHTS[key] ?? Object.entries(HIGHLIGHTS).find(([name]) => key.includes(name))?.[1] ?? [];
}

function maps(query: string) {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

type Idea = { title: string; query: string };

const IDEAS: Record<Interest | "default", { morning: Idea[]; afternoon: Idea[]; evening: Idea[] }> = {
  default: {
    morning: [{ title: "Breakfast at a local favorite", query: "best breakfast" }, { title: "Coffee and a walk downtown", query: "coffee shop downtown" }, { title: "Visit a top sight", query: "top attractions" }],
    afternoon: [{ title: "Explore a popular neighborhood", query: "best neighborhoods to walk" }, { title: "Lunch where locals go", query: "best lunch" }, { title: "Free things to do", query: "free things to do" }],
    evening: [{ title: "Dinner at a well-rated spot", query: "best dinner restaurants" }, { title: "Sunset or city views", query: "best views" }, { title: "Dessert stop", query: "best dessert" }],
  },
  food: {
    morning: [{ title: "Brunch spot locals rave about", query: "best brunch" }],
    afternoon: [{ title: "Food hall or market crawl", query: "food hall" }],
    evening: [{ title: "Signature local dish for dinner", query: "famous local food restaurant" }],
  },
  music: {
    morning: [{ title: "Record store browse", query: "record store" }],
    afternoon: [{ title: "Music history museum or tour", query: "music museum" }],
    evening: [{ title: "Live music tonight", query: "live music venues" }],
  },
  nightlife: {
    morning: [{ title: "Slow start and a big breakfast", query: "late breakfast" }],
    afternoon: [{ title: "Rooftop or patio hangout", query: "rooftop bar" }],
    evening: [{ title: "Bar hop the main strip", query: "best bars" }],
  },
  outdoors: {
    morning: [{ title: "Morning hike or trail", query: "hiking trails" }],
    afternoon: [{ title: "Park or lake time", query: "best parks" }],
    evening: [{ title: "Sunset spot", query: "sunset viewpoint" }],
  },
  museums: {
    morning: [{ title: "Top museum when doors open", query: "best museums" }],
    afternoon: [{ title: "History walk or landmark tour", query: "historic sites" }],
    evening: [{ title: "Gallery or arts district", query: "arts district" }],
  },
  family: {
    morning: [{ title: "Zoo, aquarium, or kids museum", query: "zoo aquarium children's museum" }],
    afternoon: [{ title: "Playground or family park", query: "family friendly parks" }],
    evening: [{ title: "Kid-friendly dinner", query: "family friendly restaurants" }],
  },
  shopping: {
    morning: [{ title: "Local shops and boutiques", query: "local boutiques" }],
    afternoon: [{ title: "Outlet or main shopping district", query: "shopping district outlet" }],
    evening: [{ title: "Night market or shopping street", query: "shopping street" }],
  },
  beach: {
    morning: [{ title: "Beach morning before the crowds", query: "best beaches" }],
    afternoon: [{ title: "Beach lunch and swim", query: "beachfront restaurant" }],
    evening: [{ title: "Sunset on the water", query: "sunset beach" }],
  },
  romance: {
    morning: [{ title: "Coffee and a scenic stroll", query: "scenic walk" }],
    afternoon: [{ title: "Couples activity", query: "things to do for couples" }],
    evening: [{ title: "Date-night dinner", query: "romantic restaurants" }],
  },
  sports: {
    morning: [{ title: "Stadium or arena tour", query: "stadium tour" }],
    afternoon: [{ title: "Sports bar for the game", query: "sports bar" }],
    evening: [{ title: "Catch a game if one is on", query: "sports games tickets" }],
  },
};

const TIMES = {
  morning: { start: "09:00", end: "12:00" },
  afternoon: { start: "13:00", end: "17:00" },
  evening: { start: "18:30", end: "21:30" },
} as const;

function pick<T>(list: T[], index: number) {
  return list[index % list.length];
}

function dayLabel(iso: string) {
  return fromIso(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function buildDays(input: PlanInput): PlanDay[] {
  const count = daysBetween(input.start, input.end) + 1;
  const highlights = highlightsFor(input.destination);
  const pool = input.interests.length ? input.interests : [];
  const city = input.destination;
  const days: PlanDay[] = [];
  let h = 0;
  for (let i = 0; i < count; i++) {
    const date = addDays(input.start, i);
    const interest = pool.length ? pick(pool, i) : null;
    const first = i === 0;
    const last = i === count - 1 && count > 1;
    const slots: Slot[] = (["morning", "afternoon", "evening"] as const).map((time, s) => {
      if (first && time === "morning") {
        return {
          time,
          ...TIMES[time],
          title: input.origin ? `Travel from ${input.origin} to ${city}` : `Get to ${city}`,
          detail: "Head out, check in or drop bags, and grab a bite near where you are staying.",
          href: input.origin ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(input.origin)}&destination=${encodeURIComponent(city)}` : maps(`${city}`),
        };
      }
      if (last && time === "evening") {
        return {
          time,
          ...TIMES[time],
          title: input.origin ? `Head home to ${input.origin}` : "Head home",
          detail: "Check out, pack the car or get to the airport with time to spare.",
          href: input.origin ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(city)}&destination=${encodeURIComponent(input.origin)}` : undefined,
        };
      }
      // Use a known highlight for one slot a day, rotating which slot.
      if (highlights.length && h < highlights.length && s === (i % 2 === 0 ? 1 : 0)) {
        const title = highlights[h++];
        return { time, ...TIMES[time], title, detail: `A ${city} favorite. Check hours and tickets before you go.`, href: maps(`${title} ${city}`) };
      }
      const ideas = interest ? [...IDEAS[interest][time], ...IDEAS.default[time]] : IDEAS.default[time];
      const idea = pick(ideas, i + s);
      return {
        time,
        ...TIMES[time],
        title: idea.title,
        detail: `Open the map for the top-rated picks in ${city}.`,
        href: maps(`${idea.query} in ${city}`),
      };
    });
    const theme = first ? "Arrive and settle in" : last ? "Last morning and head home" : interest ? `${INTERESTS.find((x) => x.id === interest)?.label} day` : "Explore the city";
    days.push({ date, label: `Day ${i + 1} · ${dayLabel(date)}`, theme, slots });
  }
  return days;
}

function buildBudget(input: PlanInput, nights: number): { lines: BudgetLine[] | null; note: string } {
  if (!input.budget) {
    return { lines: null, note: "Add a total budget and LifeSaver will split it into travel, stay, food, and things to do." };
  }
  const b = input.budget;
  const dayCount = nights + 1;
  const share = nights === 0 ? { travel: 0.35, stay: 0, food: 0.4, activities: 0.25 } : { travel: 0.3, stay: 0.4, food: 0.2, activities: 0.1 };
  const travel = Math.round(b * share.travel);
  const stay = Math.round(b * share.stay);
  const food = Math.round(b * share.food);
  const activities = b - travel - stay - food;
  const perNight = nights ? Math.round(stay / nights) : 0;
  const perPersonDay = Math.round(food / dayCount / input.travelers);
  const lines: BudgetLine[] = [
    { id: "travel", label: "Getting there", amount: travel, note: input.travelers > 1 ? `About $${Math.round(travel / input.travelers)} a person for flights or gas.` : "Flights or gas, round trip." },
    { id: "stay", label: "Stay", amount: stay, note: nights ? `About $${perNight} a night for ${nights} night${nights === 1 ? "" : "s"}.` : "Day trip, no hotel." },
    { id: "food", label: "Food", amount: food, note: `About $${perPersonDay} a person a day.` },
    { id: "activities", label: "Things to do", amount: activities, note: "Tickets, tours, and extras." },
  ];
  const tight = nights > 0 && perNight < 80;
  return {
    lines,
    note: `Suggested split of your $${b.toLocaleString("en-US")} budget, not a price quote.${tight ? " That nightly amount is tight, so look at motels, hostels, or a vacation rental split between people." : ""}`,
  };
}

function buildPacking(input: PlanInput, nights: number): string[] {
  const month = fromIso(input.start).getMonth();
  const days = nights + 1;
  const list = [
    "ID and wallet",
    "Phone charger and a power bank",
    `${days} day${days === 1 ? "" : "s"} of outfits, plus one spare`,
    "Toiletries and any prescriptions",
    "Comfortable walking shoes",
  ];
  if (nights > 0) list.push("Sleepwear");
  if (month === 11 || month <= 1) list.push("Warm coat, gloves, and a hat (check the forecast)");
  else if (month >= 5 && month <= 7) list.push("Sunscreen, sunglasses, and a water bottle");
  else list.push("A light jacket or layers (check the forecast)");
  if (input.interests.includes("beach")) list.push("Swimsuit, towel, and flip-flops");
  if (input.interests.includes("outdoors")) list.push("Hiking shoes, a daypack, and bug spray");
  if (input.interests.includes("family")) list.push("Snacks, wipes, and a tablet for the ride");
  if (input.interests.includes("nightlife") || input.interests.includes("romance")) list.push("One going-out outfit");
  if (input.interests.includes("sports")) list.push("Team gear and the stadium's bag rules");
  if (input.origin) list.push("Car check: tires, oil, and a full tank before you leave");
  return list;
}

export function travelLinks(input: PlanInput): PlanLink[] {
  const people = input.travelers;
  const links: PlanLink[] = [];
  if (input.origin) {
    links.push({
      label: "Compare prices: flights",
      detail: "Google Flights with your dates.",
      href: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${input.origin} to ${input.destination} on ${input.start} through ${input.end} for ${people} adults`)}`,
    });
    links.push({
      label: "Driving directions",
      detail: "Google Maps route and drive time.",
      href: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(input.origin)}&destination=${encodeURIComponent(input.destination)}&travelmode=driving`,
    });
  } else {
    links.push({
      label: "Compare prices: flights",
      detail: "Google Flights. Add where you're leaving from.",
      href: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights to ${input.destination} on ${input.start} through ${input.end} for ${people} adults`)}`,
    });
  }
  if (input.end > input.start) {
    const booking = new URL("https://www.booking.com/searchresults.html");
    booking.searchParams.set("ss", input.destination);
    booking.searchParams.set("checkin", input.start);
    booking.searchParams.set("checkout", input.end);
    booking.searchParams.set("group_adults", String(people));
    booking.searchParams.set("no_rooms", "1");
    links.push({ label: "Compare prices: hotels", detail: "Booking.com with your dates.", href: booking.toString() });
    links.push({
      label: "Compare prices: Google Hotels",
      detail: "Google Hotels for the same nights.",
      href: `https://www.google.com/travel/hotels?q=${encodeURIComponent(`hotels in ${input.destination} ${input.start} to ${input.end} ${people} adults`)}`,
    });
  }
  links.push({ label: "Things to do", detail: "Top-rated spots on Google Maps.", href: maps(`things to do in ${input.destination}`) });
  links.push({ label: "Weather", detail: "Forecast for your trip.", href: `https://www.google.com/search?q=${encodeURIComponent(`weather ${input.destination} ${input.start}`)}` });
  return links;
}

function hashId(value: string) {
  let hash = 5381;
  for (const char of value) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return hash.toString(36);
}

export function buildItinerary(input: PlanInput): Itinerary {
  const nights = daysBetween(input.start, input.end);
  const budget = buildBudget(input, nights);
  const createdAt = new Date().toISOString();
  return {
    id: `trip-${hashId(`${input.destination}|${input.start}|${input.end}|${createdAt}`)}`,
    createdAt,
    input,
    title: `${nights + 1}-day trip to ${input.destination}`,
    nights,
    days: buildDays(input),
    budget: budget.lines,
    budgetNote: budget.note,
    packing: buildPacking(input, nights),
    links: travelLinks(input),
    notes: [
      "LifeSaver does not book anything for you. Prices open on each site, live.",
      "Check opening hours and tickets before you go. Places change.",
    ],
    enriched: false,
  };
}

function icsEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

function icsFold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

/** Floating local times so events land at the trip's local clock time. */
export function itineraryToIcs(plan: Itinerary): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LifeSaver//Trip Planner//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsEscape(plan.title)}`];
  for (const day of plan.days) {
    const d = day.date.replace(/-/g, "");
    day.slots.forEach((slot, index) => {
      lines.push(
        "BEGIN:VEVENT",
        `UID:${plan.id}-${d}-${index}@golifesaver.com`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${d}T${slot.start.replace(":", "")}00`,
        `DTEND:${d}T${slot.end.replace(":", "")}00`,
        `SUMMARY:${icsEscape(slot.title)}`,
        `DESCRIPTION:${icsEscape(`${slot.detail}${slot.href ? `\n${slot.href}` : ""}\nPlanned with LifeSaver`)}`,
        `LOCATION:${icsEscape(plan.input.destination)}`,
        "END:VEVENT",
      );
    });
  }
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

export function summarize(plan: Itinerary) {
  const top = plan.days
    .map((day) => `${day.label}: ${day.slots.map((slot) => slot.title).join(" · ")}`)
    .join("\n");
  const budget = plan.budget ? `\n\nBudget split (estimate): ${plan.budget.map((line) => `${line.label} $${line.amount}`).join(", ")}.` : "";
  return `${plan.title}, ${plan.input.travelers} traveler${plan.input.travelers === 1 ? "" : "s"}.\n\n${top}${budget}`;
}
