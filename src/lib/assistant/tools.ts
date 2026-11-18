import { bills, deals } from "@/lib/demo-data";
import { lookupFuel } from "@/lib/fuel/providers";
import { formatMiles } from "@/lib/fuel/types";
import { money } from "@/lib/money";
import { cheapest, deliveryOptions, rideOptions } from "@/lib/rides";
import { offersFor, type TaskCategory } from "@/lib/tasks";
import { searchTrip } from "@/lib/travel/search";
import { alertsAt } from "@/lib/weather/alerts";
import { geocodeUs } from "@/lib/weather/fetch";
import { detectRoadside, ROADSIDE, ROADSIDE_SAFETY, type RoadsideIssue } from "@/lib/roadside/info";
import { buildItinerary, normalizeInput, parseTripRequest, summarize, type PlanInput } from "@/lib/travel/itinerary";
import type { PaidPlan } from "@/lib/pricing";

export type ToolCard = { title: string; body: string; href?: string };

export type ToolResult = { text: string; cards: ToolCard[] };

const diy: Record<string, string[]> = {
  engine: [
    "Check that the tank has fresh gas, not last season's fuel.",
    "Turn the choke on for a cold start, then off once it catches.",
    "Pull the spark plug. If it is black and wet, dry it and try again.",
    "If it starts and dies, the air filter or carburetor is the usual next step.",
  ],
  repair: [
    "Turn the water or breaker off before you open anything.",
    "Look for the obvious: a loose mount, a tripped GFCI, a clogged aerator.",
    "If a part is cracked or you smell gas or burning, stop and get a person.",
  ],
  yard: ["Walk the yard for rocks and toys before you mow.", "Bag wet grass so the mower does not bog down."],
  moving: ["Empty the piece first.", "Straps beat a sore back. Two people for anything above a dresser."],
  assembly: ["Sort the hardware before you start.", "Do not fully tighten bolts until the frame is square."],
};

function handCategory(text: string): TaskCategory {
  const lower = text.toLowerCase();
  if (/mower|engine|trimmer|won't start|wont start/.test(lower)) return "engine";
  if (/repair|leak|door|toilet|fix/.test(lower)) return "repair";
  if (/move|couch|heavy|lift/.test(lower)) return "moving";
  if (/assembl|furniture|ikea|desk/.test(lower)) return "assembly";
  if (/yard|mow|hedge|weed/.test(lower)) return "yard";
  return "engine";
}

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  context: { zip: string; plan: PaidPlan },
): Promise<ToolResult> {
  if (name === "cheapest_gas") {
    const zip = typeof args.zip === "string" && /^\d{5}$/.test(args.zip) ? args.zip : context.zip;
    if (!/^\d{5}$/.test(zip)) {
      return { text: "I need a 5-digit ZIP to look up stations.", cards: [] };
    }
    const lookup = await lookupFuel({ zip, radiusMeters: 4828 });
    const top = lookup.stations.slice(0, 3);
    return {
      text: lookup.notice,
      cards: top.map((station) => {
        const price = station.prices.regular;
        const label = !price
          ? "No price listed"
          : price.kind === "estimated"
            ? `Est. ${money(price.amount)} regular. Not a live pump price.`
            : price.kind === "reported"
              ? `${money(price.amount)} reported on OpenStreetMap.`
              : `${money(price.amount)} live regular.`;
        return {
          title: station.name,
          body: `${label} ${formatMiles(station.distanceMeters)}.`,
          href: "/fuel",
        };
      }),
    };
  }

  if (name === "compare_rides") {
    const ride = cheapest(rideOptions);
    const delivery = cheapest(deliveryOptions);
    return {
      text: `These are sample fares, not live quotes. LifeSaver is not an Uber or Lyft partner. In this sample, ${ride.name} is cheaper for the ride and ${delivery.name} has the lower delivery fee.`,
      cards: [...rideOptions, ...deliveryOptions].map((option) => ({
        title: `${option.name} · sample ${money(option.price)}`,
        body: option.detail,
        href: option.href,
      })),
    };
  }

  if (name === "cheapest_trip") {
    const from = String(args.from ?? "SFO");
    const to = String(args.to ?? "");
    const depart = String(args.depart ?? "2026-12-04");
    const returnDate = String(args.returnDate ?? "2026-12-08");
    const travelers = Number(args.travelers ?? 1);
    if (!to) return { text: "Tell me where you want to go.", cards: [{ title: "Open travel", body: "Enter the trip there.", href: "/travel" }] };
    if (context.plan !== "hand") {
      return {
        text: "Cheapest trips are part of Lend a Hand at $19.99 a month after launch, or $14.99 for life if you joined the waitlist. I can still point you there.",
        cards: [{ title: "See Lend a Hand", body: "Flights, stays, and cars.", href: "/pricing" }],
      };
    }
    const result = await searchTrip({ from, to, depart, returnDate, travelers });
    const flight = [...result.flights].sort((a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity))[0];
    return {
      text: result.notice,
      cards: [
        flight && {
          title: `${flight.provider}: ${flight.priceKind === "sample" ? "sample " : ""}${flight.amount == null ? "see site" : money(flight.amount)}`,
          body: flight.detail,
          href: flight.href,
        },
        {
          title: result.drive.fuelCost == null ? "Driving fuel" : `Est. ${money(result.drive.fuelCost)} to drive`,
          body: result.drive.note,
          href: "/travel",
        },
      ].filter(Boolean) as ToolCard[],
    };
  }

  if (name === "weather_alerts") {
    const place = typeof args.place === "string" && args.place.trim().length >= 2 ? args.place.trim() : context.zip;
    if (!place) return { text: "Tell me a ZIP or city and I'll check the National Weather Service.", cards: [{ title: "Open Alerts", body: "Uses your location.", href: "/alerts" }] };
    try {
      const spot = await geocodeUs(place);
      const alerts = await alertsAt(spot.lat, spot.lng);
      if (!alerts.length) {
        return { text: `No active National Weather Service alerts for ${spot.name} right now.`, cards: [{ title: "Open Alerts", body: "Check another place or turn on severe-alert notifications.", href: "/alerts" }] };
      }
      return {
        text: `${alerts.length} active alert${alerts.length === 1 ? "" : "s"} for ${spot.name} from the National Weather Service:`,
        cards: [
          ...alerts.slice(0, 3).map((a) => ({ title: `${a.severity}: ${a.event}`, body: `${a.headline}${a.instruction ? ` ${a.instruction.slice(0, 160)}…` : ""}`, href: "/alerts" })),
        ],
      };
    } catch (cause) {
      return { text: cause instanceof Error ? cause.message : "I couldn't check alerts right now.", cards: [{ title: "Open Alerts", body: "Try again there.", href: "/alerts" }] };
    }
  }

  if (name === "roadside_help") {
    const raw = String(args.issue ?? "");
    const issue: RoadsideIssue =
      raw in ROADSIDE ? (raw as RoadsideIssue) : detectRoadside(String(args.message ?? raw)) ?? "breakdown";
    const info = ROADSIDE[issue];
    const first = issue === "accident" ? "If anyone is hurt or a car is blocking traffic, call 911 now.\n\n" : `${ROADSIDE_SAFETY}\n\n`;
    return {
      text: `${first}${info.label}:\n${info.steps.slice(0, 3).map((step, index) => `${index + 1}. ${step}`).join("\n")}\n\nOpen Roadside Help to share your location, find a tow${issue === "out_of_gas" ? ", the nearest gas, or fuel delivery" : ""}, or ask nearby Lend a Hand helpers. Helpers are community members, not pros, and nobody is guaranteed to come.`,
      cards: [
        { title: "Call 911", body: "Danger, injury, or stuck in a traffic lane.", href: "tel:911" },
        { title: `Open Roadside Help · ${info.label}`, body: "Location, tow and service links, nearby helpers.", href: `/roadside?issue=${issue}` },
      ],
    };
  }

  if (name === "plan_trip") {
    const request = String(args.request ?? "").slice(0, 400);
    const parsed = parseTripRequest(request);
    const fields = Object.fromEntries(
      ["destination", "origin", "start", "end", "travelers", "budget"].flatMap((key) => (args[key] != null && args[key] !== "" ? [[key, args[key]]] : [])),
    );
    const { missing: _missing, assumedDates: _assumed, ...known } = parsed;
    void _missing;
    void _assumed;
    const merged: Record<string, unknown> & { destination?: unknown; start?: unknown; end?: unknown; travelers?: unknown; budget?: unknown } = { ...known, ...fields };
    const plannerHref = `/plan?q=${encodeURIComponent(request || [merged.destination, merged.start, merged.end].filter(Boolean).join(" "))}`;
    if (!merged.destination || !merged.start) {
      const need = [!merged.destination && "where you're going", !merged.start && "your dates"].filter(Boolean).join(" and ");
      return {
        text: `I can build that itinerary. Tell me ${need}, plus how many people and your budget. Example: "Plan a 3-day trip to Nashville Dec 5-7 for 2, $800".`,
        cards: [{ title: "Open the trip planner", body: "Fill in a quick form instead.", href: "/plan" }],
      };
    }
    const input = normalizeInput({ ...(merged as Partial<PlanInput>), travelers: merged.travelers == null ? 1 : Number(merged.travelers), budget: merged.budget == null ? null : Number(merged.budget) });
    if (typeof input === "string") return { text: input, cards: [{ title: "Open the trip planner", body: "Fix it in the form.", href: "/plan" }] };
    const plan = buildItinerary(input);
    const compare = plan.links.filter((link) => link.label.startsWith("Compare prices")).slice(0, 2);
    return {
      text: `${parsed.assumedDates && !args.start ? "No dates given, so I penciled in two weeks from now. Tell me your dates to change it.\n\n" : ""}${summarize(plan)}\n\nOpen the full plan to save it, add it to your calendar, and see the packing list. Prices open live on each site. LifeSaver doesn't show made-up fares.`,
      cards: [
        { title: "Open full itinerary", body: "Save it, add to calendar, packing list.", href: plannerHref },
        ...compare.map((link) => ({ title: link.label, body: link.detail, href: link.href })),
      ],
    };
  }

  if (name === "cut_bills") {
    const flagged = bills.filter((bill) => bill.flags.length > 0);
    return {
      text: "These are sample subscriptions, not your live accounts. The ones with flags are the first to review.",
      cards: flagged.map((bill) => ({
        title: bill.name,
        body: `${bill.note ?? bill.renewsLabel} Sample charge ${money(bill.amount)}.`,
        href: `/bills#${bill.id}`,
      })),
    };
  }

  if (name === "local_deals") {
    return {
      text: "Sample deals, not a live flyer. The full list is on Deals.",
      cards: deals.slice(0, 4).map((deal) => ({
        title: deal.merchant,
        body: `${deal.title}. ${deal.priceLabel}. ${deal.savingsLabel}. Sample.`,
        href: "/deals",
      })),
    };
  }

  if (name === "build_budget") {
    const income = Number(args.income);
    if (!Number.isFinite(income) || income <= 0) {
      return { text: "Tell me your monthly take-home pay and I will sketch a budget.", cards: [] };
    }
    const needs = Math.round(income * 0.5);
    const wants = Math.round(income * 0.3);
    const save = income - needs - wants;
    return {
      text: `A simple split of ${money(income)} take-home. This is a sketch, not a statement from your bank.`,
      cards: [
        { title: "Needs", body: `${money(needs)} for rent, food, and bills.` },
        { title: "Wants", body: `${money(wants)} for the rest of the month.` },
        { title: "Save", body: `${money(save)} left to keep.` },
      ],
    };
  }

  if (name === "get_a_hand") {
    const description = String(args.description ?? "my mower won't start");
    const category = handCategory(description);
    const tips = diy[category] ?? diy.engine;
    if (context.plan !== "hand") {
      return {
        text: `Try this first:\n${tips.map((tip, index) => `${index + 1}. ${tip}`).join("\n")}\n\nPosting a helper is part of Lend a Hand.`,
        cards: [{ title: "Upgrade to Lend a Hand", body: "$19.99/mo after launch. Founding members lock $14.99/mo for life.", href: "/pricing" }],
      };
    }
    const offers = offersFor(category).slice(0, 2);
    return {
      text: `Try this first:\n${tips.map((tip, index) => `${index + 1}. ${tip}`).join("\n")}\n\nIf that does not fix it, here is a sample Get a Hand request. Nobody was notified.`,
      cards: offers.map((offer) => ({
        title: `${offer.name} · sample ${money(offer.price)}`,
        body: `${offer.blurb} ${offer.eta}.`,
        href: "/hand",
      })),
    };
  }

  return { text: "I can look up gas, rides, trips, bills, deals, a budget, or a helper, or plan a trip itinerary.", cards: [] };
}
