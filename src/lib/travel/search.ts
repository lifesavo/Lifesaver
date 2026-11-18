import { haversineMiles, resolvePlace } from "@/lib/travel/places";
import type { TravelOption, TravelSearch, TripQuery } from "@/lib/travel/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseTrip(input: Partial<TripQuery>): TripQuery | string {
  const from = input.from?.trim() ?? "";
  const to = input.to?.trim() ?? "";
  const depart = input.depart?.trim() ?? "";
  const returnDate = input.returnDate?.trim() ?? "";
  const travelers = Number(input.travelers);
  if (from.length < 2 || to.length < 2) return "Enter a from and a to.";
  if (!DATE.test(depart) || !DATE.test(returnDate) || returnDate < depart) {
    return "Use a departure date and a return date after it.";
  }
  if (!Number.isInteger(travelers) || travelers < 1 || travelers > 6) {
    return "Travelers must be from 1 to 6.";
  }
  return { from, to, depart, returnDate, travelers };
}

function sampleAmount(seed: string, low: number, span: number) {
  let hash = 0;
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return Math.round((low + (hash % span)) * 100) / 100;
}

function flightLinks(from: string, to: string, query: TripQuery) {
  const kayak = `https://www.kayak.com/flights/${from}-${to}/${query.depart}/${query.returnDate}?sort=bestflight_a&adults=${query.travelers}`;
  const google = `https://www.google.com/travel/flights?q=${encodeURIComponent(
    `Flights from ${from} to ${to} on ${query.depart} through ${query.returnDate} for ${query.travelers} adults`,
  )}`;
  return { kayak, google };
}

function stayLinks(toLabel: string, query: TripQuery) {
  const aid = process.env.BOOKING_AFFILIATE_ID;
  const booking = new URL("https://www.booking.com/searchresults.html");
  booking.searchParams.set("ss", toLabel);
  booking.searchParams.set("checkin", query.depart);
  booking.searchParams.set("checkout", query.returnDate);
  booking.searchParams.set("group_adults", String(query.travelers));
  if (aid) booking.searchParams.set("aid", aid);
  const expedia = new URL("https://www.expedia.com/Hotel-Search");
  expedia.searchParams.set("destination", toLabel);
  expedia.searchParams.set("startDate", query.depart);
  expedia.searchParams.set("endDate", query.returnDate);
  expedia.searchParams.set("adults", String(query.travelers));
  return { booking: booking.toString(), expedia: expedia.toString() };
}

function carLinks(from: string, to: string, query: TripQuery) {
  return {
    kayak: `https://www.kayak.com/cars/${from}/${to}/${query.depart}/${query.returnDate}`,
    expedia: `https://www.expedia.com/carsearch?locn=${encodeURIComponent(from)}&date1=${query.depart}&date2=${query.returnDate}`,
  };
}

type AmadeusSession = { token: string; host: string };

async function amadeus(): Promise<AmadeusSession | null> {
  const id = process.env.AMADEUS_CLIENT_ID;
  const secret = process.env.AMADEUS_CLIENT_SECRET;
  if (!id || !secret) return null;
  const host = process.env.AMADEUS_HOST || "test.api.amadeus.com";
  const response = await fetch(`https://${host}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) return null;
  return { token: body.access_token, host };
}

async function amadeusFlights(session: AmadeusSession, from: string, to: string, query: TripQuery): Promise<TravelOption[] | null> {
  const url = new URL(`https://${session.host}/v2/shopping/flight-offers`);
  url.searchParams.set("originLocationCode", from);
  url.searchParams.set("destinationLocationCode", to);
  url.searchParams.set("departureDate", query.depart);
  url.searchParams.set("returnDate", query.returnDate);
  url.searchParams.set("adults", String(query.travelers));
  url.searchParams.set("currencyCode", "USD");
  url.searchParams.set("max", "3");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${session.token}` } });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    data?: Array<{ id?: string; price?: { grandTotal?: string }; validatingAirlineCodes?: string[] }>;
  };
  const options = (body.data ?? []).flatMap((offer) => {
    const amount = Number(offer.price?.grandTotal);
    if (!Number.isFinite(amount)) return [];
    const airline = offer.validatingAirlineCodes?.[0] ?? "Airline";
    return [
      {
        id: `amadeus-flight-${offer.id ?? amount}`,
        kind: "flight" as const,
        provider: "Amadeus",
        title: `${airline} ${from} to ${to}`,
        detail: "Live fare from Amadeus. Taxes included in the total shown.",
        amount,
        priceKind: "live" as const,
        href: flightLinks(from, to, query).google,
      },
    ];
  });
  return options.length ? options : null;
}

async function kiwiFlights(from: string, to: string, query: TripQuery): Promise<TravelOption[] | null> {
  const key = process.env.KIWI_API_KEY;
  if (!key) return null;
  const url = new URL("https://api.tequila.kiwi.com/v2/search");
  url.searchParams.set("fly_from", from);
  url.searchParams.set("fly_to", to);
  url.searchParams.set("date_from", query.depart);
  url.searchParams.set("date_to", query.depart);
  url.searchParams.set("return_from", query.returnDate);
  url.searchParams.set("return_to", query.returnDate);
  url.searchParams.set("adults", String(query.travelers));
  url.searchParams.set("curr", "USD");
  url.searchParams.set("limit", "3");
  const response = await fetch(url, { headers: { apikey: key } });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    data?: Array<{ id?: string; price?: number; cityFrom?: string; cityTo?: string; deep_link?: string }>;
  };
  const options = (body.data ?? []).flatMap((offer) => {
    if (typeof offer.price !== "number") return [];
    return [
      {
        id: `kiwi-${offer.id ?? offer.price}`,
        kind: "flight" as const,
        provider: "Kiwi",
        title: `${offer.cityFrom ?? from} to ${offer.cityTo ?? to}`,
        detail: "Live fare from Kiwi Tequila.",
        amount: offer.price,
        priceKind: "live" as const,
        href: offer.deep_link || flightLinks(from, to, query).kayak,
      },
    ];
  });
  return options.length ? options : null;
}

function sampleFlights(from: string, to: string, query: TripQuery): TravelOption[] {
  const links = flightLinks(from, to, query);
  const seed = `${from}-${to}-${query.depart}-${query.travelers}`;
  return [
    {
      id: "sample-kayak",
      kind: "flight",
      provider: "Kayak",
      title: `${from} to ${to}`,
      detail: "Sample fare for the layout. Open Kayak for a real search.",
      amount: sampleAmount(seed, 140, 280),
      priceKind: "sample",
      href: links.kayak,
    },
    {
      id: "sample-google-flights",
      kind: "flight",
      provider: "Google Flights",
      title: `${from} to ${to}`,
      detail: "Sample fare for the layout. Open Google Flights for a real search.",
      amount: sampleAmount(`${seed}-g`, 150, 260),
      priceKind: "sample",
      href: links.google,
    },
  ];
}

function sampleStays(toLabel: string, query: TripQuery): TravelOption[] {
  const links = stayLinks(toLabel, query);
  const seed = `stay-${toLabel}-${query.depart}-${query.returnDate}`;
  return [
    {
      id: "sample-booking",
      kind: "stay",
      provider: "Booking.com",
      title: `Stays in ${toLabel}`,
      detail: "Sample nightly total. Open Booking.com for live rates.",
      amount: sampleAmount(seed, 110, 180),
      priceKind: "sample",
      href: links.booking,
    },
    {
      id: "sample-expedia-stay",
      kind: "stay",
      provider: "Expedia",
      title: `Stays in ${toLabel}`,
      detail: "Sample nightly total. Open Expedia for live rates.",
      amount: sampleAmount(`${seed}-e`, 120, 170),
      priceKind: "sample",
      href: links.expedia,
    },
  ];
}

function sampleCars(from: string, to: string, query: TripQuery): TravelOption[] {
  const links = carLinks(from, to, query);
  const seed = `car-${from}-${query.depart}`;
  return [
    {
      id: "sample-kayak-car",
      kind: "car",
      provider: "Kayak",
      title: `Car from ${from}`,
      detail: "Sample total. Open Kayak for live rental rates.",
      amount: sampleAmount(seed, 35, 50) * 7,
      priceKind: "sample",
      href: links.kayak,
    },
    {
      id: "sample-expedia-car",
      kind: "car",
      provider: "Expedia",
      title: `Car from ${from}`,
      detail: "Sample total. Open Expedia for live rental rates.",
      amount: sampleAmount(`${seed}-e`, 40, 45) * 7,
      priceKind: "sample",
      href: links.expedia,
    },
  ];
}

export async function searchTrip(query: TripQuery): Promise<TravelSearch> {
  const origin = resolvePlace(query.from);
  const destination = resolvePlace(query.to);
  const fromCode = origin?.code ?? query.from.toUpperCase();
  const toCode = destination?.code ?? query.to.toUpperCase();
  const toLabel = destination?.city ?? query.to;

  let flights: TravelOption[] | null = null;
  const session = await amadeus().catch(() => null);
  if (session && /^[A-Z]{3}$/.test(fromCode) && /^[A-Z]{3}$/.test(toCode)) {
    flights = await amadeusFlights(session, fromCode, toCode, query).catch(() => null);
  }
  if (!flights) {
    flights = await kiwiFlights(fromCode, toCode, query).catch(() => null);
  }
  const liveFlights = Boolean(flights?.length);
  if (!flights) flights = sampleFlights(fromCode, toCode, query);

  const stays = sampleStays(toLabel, query);
  const cars = sampleCars(fromCode, toCode, query);
  const cheapestFlight = [...flights].sort((a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity))[0];

  let miles: number | null = null;
  let fuelCost: number | null = null;
  if (origin && destination) {
    miles = Math.round(haversineMiles(origin, destination) * 1.2);
    const gallons = miles / 28;
    fuelCost = Math.round(gallons * 3.89 * 100) / 100;
  }

  const driveNote = miles
    ? `Estimated fuel only, about ${miles} road miles at 28 mpg and $3.89 a gallon. Not a live gas quote. ${
        cheapestFlight?.priceKind === "live"
          ? "The flight figure next to it is a live fare."
          : "The flight figure next to it is a sample, not a live fare."
      }`
    : "Use two cities or airport codes LifeSaver recognizes to estimate driving fuel. The map link still opens.";

  return {
    liveConnected: liveFlights,
    notice: liveFlights
      ? "Flight prices are live. Stays, rental cars, and the driving fuel figure are samples or estimates unless a row says otherwise."
      : "No live flight, hotel, or rental feed is connected. Dollar amounts below are samples so the layout is visible. Each button opens a real search on that site. Do not treat the samples as fares.",
    flights,
    stays,
    cars,
    drive: {
      miles,
      fuelCost,
      flightCost: cheapestFlight?.amount ?? null,
      flightKind: cheapestFlight?.priceKind ?? null,
      note: driveNote,
      href: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(query.from)}&destination=${encodeURIComponent(query.to)}&travelmode=driving`,
    },
  };
}
