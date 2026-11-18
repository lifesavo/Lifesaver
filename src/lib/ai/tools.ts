import { countGiveawayEntries, deleteUserTrip, listUserTrips, publicWinnerFor, saveUserTrip } from "@/lib/db";
import { lookupFuel } from "@/lib/fuel/providers";
import { currentWeek, previousWeekKey, PRIZE_LABEL } from "@/lib/giveaway/week";
import { roadsideInfo } from "@/lib/roadside/info";
import { submitRoadsideRequest } from "@/lib/roadside/requests";
import { listMyRoadside } from "@/lib/db";
import { buildItinerary, normalizeInput, parseTripRequest, type Itinerary, type PlanInput } from "@/lib/travel/itinerary";
import { forecast, geocodeUs } from "@/lib/weather/fetch";
import { pickOutfit } from "@/lib/weather/outfit";

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://golifesaver.com").replace(/\/$/, "");

type JsonSchema = { type: "object"; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean };

export type AiTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  /** Needs a personal access token (acts on the user's own saved data). */
  auth: boolean;
  readOnly: boolean;
  run: (args: Record<string, unknown>, ownerId: string | null) => Promise<unknown>;
};

export class ToolError extends Error {}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown) => (v == null || v === "" ? undefined : Number(v));

const point = {
  lat: { type: "number", description: "Latitude" },
  lng: { type: "number", description: "Longitude" },
};

function tripInput(args: Record<string, unknown>): PlanInput {
  const request = str(args.request);
  const parsed = request ? parseTripRequest(request.slice(0, 400)) : { missing: [] };
  const merged: Partial<PlanInput> = {
    ...parsed,
    ...(str(args.destination) && { destination: str(args.destination) }),
    ...(str(args.origin) && { origin: str(args.origin) }),
    ...(str(args.start) && { start: str(args.start) }),
    ...(str(args.end) && { end: str(args.end) }),
    ...(num(args.travelers) != null && { travelers: num(args.travelers) }),
    ...(num(args.budget) != null && { budget: num(args.budget) }),
    ...(Array.isArray(args.interests) && { interests: args.interests as PlanInput["interests"] }),
  };
  const input = normalizeInput(merged);
  if (typeof input === "string") throw new ToolError(input);
  return input;
}

const tripSchema: JsonSchema = {
  type: "object",
  properties: {
    request: { type: "string", description: "Plain-English trip request, e.g. 'Plan a 3-day trip to Nashville Dec 5-7 for 2, $800'." },
    destination: { type: "string" },
    origin: { type: "string", description: "Where they leave from (optional)." },
    start: { type: "string", description: "YYYY-MM-DD" },
    end: { type: "string", description: "YYYY-MM-DD" },
    travelers: { type: "integer", minimum: 1, maximum: 12 },
    budget: { type: "number", description: "Total budget in USD for the group." },
    interests: { type: "array", items: { type: "string", enum: ["food", "music", "nightlife", "outdoors", "museums", "family", "shopping", "beach", "romance", "sports"] } },
  },
  additionalProperties: false,
};

function absolutize(plan: Itinerary) {
  return { ...plan, plannerUrl: `${SITE}/plan?open=${encodeURIComponent(plan.id)}` };
}

export const AI_TOOLS: AiTool[] = [
  {
    name: "get_gas_prices",
    title: "Cheapest gas nearby",
    description:
      "Gas stations near a US ZIP code or coordinates with regular, midgrade, premium, and diesel prices. Each price has a kind: live, reported (OpenStreetMap), or estimated. Never present estimated prices as live.",
    inputSchema: { type: "object", properties: { zip: { type: "string", description: "5-digit US ZIP" }, ...point, radiusMiles: { type: "number", minimum: 0.5, maximum: 15 } }, additionalProperties: false },
    auth: false,
    readOnly: true,
    async run(args) {
      const zip = str(args.zip);
      const lat = num(args.lat);
      const lng = num(args.lng);
      const radiusMeters = Math.round(Math.min(15, Math.max(0.5, num(args.radiusMiles) ?? 3)) * 1609.34);
      if (!(lat != null && lng != null) && !/^\d{5}$/.test(zip)) throw new ToolError("Send a 5-digit ZIP or lat and lng.");
      const lookup = await lookupFuel(lat != null && lng != null ? { lat, lng, radiusMeters } : { zip, radiusMeters });
      return {
        notice: lookup.notice,
        pricesAreLive: lookup.pricesAreLive,
        fetchedAt: lookup.fetchedAt,
        stations: lookup.stations.slice(0, 10).map((s) => ({
          name: s.name,
          address: s.address,
          lat: s.lat,
          lng: s.lng,
          miles: Math.round((s.distanceMeters / 1609.34) * 10) / 10,
          prices: s.prices,
          directions: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`,
        })),
        moreAt: `${SITE}/fuel`,
      };
    },
  },
  {
    name: "what_to_wear",
    title: "What to wear today",
    description: "Today's weather for a US ZIP, city ('Denver, CO'), or coordinates, turned into outfit picks (top, bottoms, shoes, umbrella/hat/gloves) with a one-line summary.",
    inputSchema: { type: "object", properties: { place: { type: "string", description: "ZIP or 'City, ST'" }, ...point }, additionalProperties: false },
    auth: false,
    readOnly: true,
    async run(args) {
      const lat = num(args.lat);
      const lng = num(args.lng);
      let report;
      if (lat != null && lng != null) report = await forecast(lat, lng);
      else if (str(args.place).length >= 2) {
        const place = await geocodeUs(str(args.place));
        report = await forecast(place.lat, place.lng, place.name);
      } else throw new ToolError("Send a place (ZIP or city) or lat and lng.");
      return { weather: report, outfit: pickOutfit(report), moreAt: `${SITE}/weather` };
    },
  },
  {
    name: "plan_trip",
    title: "Plan a trip itinerary",
    description:
      "Builds a day-by-day itinerary (morning/afternoon/evening), an estimated budget split, a packing list, and compare-prices links (Google Flights, Booking.com, Google Hotels). Budget figures are a suggested split, not quotes. Does not book anything.",
    inputSchema: tripSchema,
    auth: false,
    readOnly: true,
    async run(args) {
      return absolutize(buildItinerary(tripInput(args)));
    },
  },
  {
    name: "roadside_help_info",
    title: "Roadside help guide",
    description:
      `Safety steps and nearby-service links for flat_tire, breakdown, out_of_gas, lockout, jump_start (dead battery), or accident. The user can open ${SITE}/roadside?issue=<issue> for location sharing, tow links, and nearby helpers. Guidance only: LifeSaver does not dispatch anyone and nothing is guaranteed. Tell the user to call 911 if they are in danger.`,
    inputSchema: { type: "object", properties: { issue: { type: "string", enum: ["flat_tire", "breakdown", "out_of_gas", "lockout", "jump_start", "accident"] } }, additionalProperties: false },
    auth: false,
    readOnly: true,
    async run(args) {
      const info = roadsideInfo(str(args.issue));
      const issues = Object.fromEntries(
        Object.entries(info.issues).map(([k, v]) => [k, { ...v, links: v.links.map((l) => ({ ...l, href: l.href.startsWith("/") ? `${SITE}${l.href}` : l.href })) }]),
      );
      return { ...info, issues };
    },
  },
  {
    name: "giveaway_info",
    title: "$100 weekly giveaway",
    description: "Current week of the free LifeSaver $100 weekly giveaway: entry window, number of entrants, last winner, and rules link. Free to enter; one entry per person per week; no purchase necessary.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    auth: false,
    readOnly: true,
    async run() {
      const week = currentWeek();
      const winner = publicWinnerFor(previousWeekKey(week.key));
      return {
        prize: PRIZE_LABEL,
        week: { key: week.key, opensAt: week.opensAt, closesAt: week.closesAt, closedNow: week.closedNow },
        entrants: countGiveawayEntries(week.key),
        lastWinner: winner ? (winner.firstName ? `${winner.firstName}${winner.lastInitial ? ` ${winner.lastInitial}.` : ""}` : "A LifeSaver member") : null,
        enterAt: `${SITE}/giveaway`,
        rules: `${SITE}/giveaway/rules`,
        note: "Free to enter. The user must enter themselves on the giveaway page.",
      };
    },
  },
  {
    name: "create_help_request",
    title: "Ask nearby Lend a Hand helpers (roadside)",
    description:
      "Posts a roadside help request so nearby LifeSaver Lend a Hand members can see it and accept. Helpers are community members, not professionals; nobody is guaranteed to respond and no tow or pro is dispatched. If anyone is in danger, tell the user to call 911 first. Needs the user's token. Get their exact location and consent before calling.",
    inputSchema: {
      type: "object",
      properties: {
        issue: { type: "string", enum: ["flat_tire", "breakdown", "out_of_gas", "lockout", "jump_start", "accident"] },
        lat: { type: "number" },
        lng: { type: "number" },
        name: { type: "string", description: "Requester's first name" },
        phone: { type: "string", description: "Phone a helper can call or text" },
        note: { type: "string", description: "Where exactly, the car, what they need (max 300 chars)" },
      },
      required: ["issue", "lat", "lng", "name", "phone"],
      additionalProperties: false,
    },
    auth: true,
    readOnly: false,
    async run(args, ownerId) {
      const result = submitRoadsideRequest(ownerId!, args);
      if (!result.ok) throw new ToolError(result.message);
      return { request: result.request, statusPage: `${SITE}/roadside`, note: "Posted to nearby helpers. Not guaranteed. Keep calling a tow or 911 if needed." };
    },
  },
  {
    name: "list_my_help_requests",
    title: "My roadside help requests",
    description: "Status of the user's roadside help requests (open, accepted with helper name and phone, done, cancelled). Needs the user's token.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    auth: true,
    readOnly: true,
    async run(_args, ownerId) {
      return { requests: listMyRoadside(ownerId!).filter((r) => r.role === "requester"), statusPage: `${SITE}/roadside` };
    },
  },
  {
    name: "list_my_trips",
    title: "My saved trips",
    description: "The user's saved trip itineraries. Needs the user's LifeSaver personal access token.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    auth: true,
    readOnly: true,
    async run(_args, ownerId) {
      return { trips: (listUserTrips(ownerId!) as Itinerary[]).map(absolutize) };
    },
  },
  {
    name: "save_trip",
    title: "Save a trip to my LifeSaver",
    description: "Plans a trip (same inputs as plan_trip) and saves it to the user's LifeSaver trips. Needs the user's personal access token.",
    inputSchema: tripSchema,
    auth: true,
    readOnly: false,
    async run(args, ownerId) {
      const plan = buildItinerary(tripInput(args));
      if (!saveUserTrip(ownerId!, plan.id, plan)) throw new ToolError("You have 50 saved trips. Delete one first.");
      return { saved: true, trip: absolutize(plan) };
    },
  },
  {
    name: "delete_my_trip",
    title: "Delete a saved trip",
    description: "Deletes one of the user's saved trips by id. Needs the user's personal access token.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false },
    auth: true,
    readOnly: false,
    async run(args, ownerId) {
      return { deleted: deleteUserTrip(ownerId!, str(args.id)) };
    },
  },
];

export async function callAiTool(name: string, args: Record<string, unknown>, ownerId: string | null) {
  const tool = AI_TOOLS.find((t) => t.name === name);
  if (!tool) throw new ToolError(`Unknown tool: ${name}`);
  if (tool.auth && !ownerId) throw new ToolError(`${name} needs your LifeSaver personal access token. Create one at ${SITE}/settings and send it as 'Authorization: Bearer <token>'.`);
  return tool.run(args ?? {}, ownerId);
}
