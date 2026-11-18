import { cached } from "@/lib/fuel/cache";
import { withEstimates } from "@/lib/fuel/estimate";
import { haversineMeters, type FuelGrade, type FuelLookup, type FuelPrice, type FuelStation } from "@/lib/fuel/types";

const USER_AGENT = "LifeSaver/0.1 (fuel lookup; contact: support@lifesaver.local)";
const FIVE_MINUTES = 5 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

const gradeFromGoogle: Record<string, FuelGrade> = {
  REGULAR_UNLEADED: "regular",
  MIDGRADE: "midgrade",
  PREMIUM: "premium",
  DIESEL: "diesel",
  TRUCK_DIESEL: "diesel",
  BIO_DIESEL: "diesel",
};

type Money = { currencyCode?: string; units?: string; nanos?: number };

function googleAmount(price: Money | undefined) {
  if (!price) return null;
  const units = Number(price.units ?? 0);
  const nanos = Number(price.nanos ?? 0);
  if (!Number.isFinite(units) || !Number.isFinite(nanos)) return null;
  const amount = Math.round((units + nanos / 1e9) * 1000) / 1000;
  if (amount <= 0 || amount > 20) return null;
  return amount;
}

async function googleStations(lat: number, lng: number, radiusMeters: number): Promise<FuelStation[] | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.fuelOptions",
    },
    body: JSON.stringify({
      includedTypes: ["gas_station"],
      maxResultCount: 20,
      rankPreference: "DISTANCE",
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
      },
    }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      fuelOptions?: {
        fuelPrices?: Array<{ type?: string; price?: Money; updateTime?: string }>;
      };
    }>;
  };
  return (body.places ?? [])
    .map((place) => {
      const placeLat = place.location?.latitude;
      const placeLng = place.location?.longitude;
      if (placeLat == null || placeLng == null) return null;
      const prices: Partial<Record<FuelGrade, FuelPrice>> = {};
      for (const fuel of place.fuelOptions?.fuelPrices ?? []) {
        const grade = fuel.type ? gradeFromGoogle[fuel.type] : undefined;
        const amount = googleAmount(fuel.price);
        if (!grade || amount == null || prices[grade]) continue;
        prices[grade] = { amount, updatedAt: fuel.updateTime ?? null, kind: "live" };
      }
      const station: FuelStation = {
        id: place.id || `${placeLat},${placeLng}`,
        name: place.displayName?.text || "Gas station",
        address: place.formattedAddress ?? null,
        lat: placeLat,
        lng: placeLng,
        distanceMeters: haversineMeters(lat, lng, placeLat, placeLng),
        prices,
      };
      return station;
    })
    .filter((station): station is FuelStation => station != null);
}

function box(lat: number, lng: number, radiusMeters: number) {
  const dLat = radiusMeters / 111320;
  const dLng = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  return { south: lat - dLat, north: lat + dLat, west: lng - dLng, east: lng + dLng };
}

type NominatimPlace = {
  place_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  extratags?: Record<string, string>;
};

function reportedPrice(tags: Record<string, string> | undefined, keys: string[]): FuelPrice | null {
  if (!tags) return null;
  for (const key of keys) {
    const raw = tags[key];
    if (!raw) continue;
    const amount = Number(raw.replace(/[^0-9.]/g, ""));
    if (amount > 1 && amount < 12) {
      return { amount, updatedAt: null, kind: "reported" };
    }
  }
  return null;
}

async function nominatimStations(lat: number, lng: number, radiusMeters: number): Promise<FuelStation[]> {
  const bounds = box(lat, lng, radiusMeters);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("amenity", "fuel");
  url.searchParams.set("limit", "20");
  url.searchParams.set("bounded", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("viewbox", `${bounds.west},${bounds.north},${bounds.east},${bounds.south}`);
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!response.ok) throw new Error("OpenStreetMap station search failed.");
  const places = (await response.json()) as NominatimPlace[];
  return places.flatMap((place) => {
    const placeLat = Number(place.lat);
    const placeLng = Number(place.lon);
    if (!Number.isFinite(placeLat) || !Number.isFinite(placeLng)) return [];
    const distanceMeters = haversineMeters(lat, lng, placeLat, placeLng);
    if (distanceMeters > radiusMeters * 1.05) return [];
    const id = `osm-${place.place_id ?? `${placeLat},${placeLng}`}`;
    const reported: Partial<Record<FuelGrade, FuelPrice>> = {};
    const regular = reportedPrice(place.extratags, ["fuel:regular", "charge:regular", "fuel:octane_87"]);
    const mid = reportedPrice(place.extratags, ["fuel:midgrade", "charge:midgrade"]);
    const premium = reportedPrice(place.extratags, ["fuel:premium", "charge:premium", "fuel:octane_91"]);
    const diesel = reportedPrice(place.extratags, ["fuel:diesel", "charge:diesel"]);
    if (regular) reported.regular = regular;
    if (mid) reported.midgrade = mid;
    if (premium) reported.premium = premium;
    if (diesel) reported.diesel = diesel;
    return [
      {
        id,
        name: place.name || "Gas station",
        address: place.display_name ?? null,
        lat: placeLat,
        lng: placeLng,
        distanceMeters,
        prices: withEstimates(id, reported),
      },
    ];
  });
}

async function geocodeZip(zip: string) {
  const result = await cached(`zip:${zip}`, ONE_DAY, async () => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("postalcode", zip);
    url.searchParams.set("country", "us");
    url.searchParams.set("limit", "1");
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
    if (!response.ok) throw new Error("Could not look up that ZIP code.");
    const rows = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const lat = Number(rows[0]?.lat);
    const lng = Number(rows[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("That ZIP code did not match a place.");
    return { lat, lng };
  });
  return result.value;
}

export async function lookupFuel(input: {
  lat?: number;
  lng?: number;
  zip?: string;
  radiusMeters: number;
}): Promise<FuelLookup> {
  const center = input.lat != null && input.lng != null
    ? { lat: input.lat, lng: input.lng }
    : await geocodeZip(input.zip || "");
  const radiusMeters = input.radiusMeters;
  const key = `fuel:${center.lat.toFixed(2)}:${center.lng.toFixed(2)}:${radiusMeters}:${process.env.GOOGLE_MAPS_API_KEY ? "g" : "o"}`;
  const result = await cached(key, FIVE_MINUTES, () => loadFuel(center.lat, center.lng, radiusMeters));
  return { ...result.value, cached: result.cached };
}

async function loadFuel(lat: number, lng: number, radiusMeters: number): Promise<Omit<FuelLookup, "cached">> {
  const fetchedAt = new Date().toISOString();
  const google = await googleStations(lat, lng, radiusMeters).catch(() => null);
  if (google && google.length > 0) {
    const pricesAreLive = google.some((station) =>
      Object.values(station.prices).some((price) => price?.kind === "live"),
    );
    return {
      source: "google",
      pricesAreLive,
      fetchedAt,
      center: { lat, lng },
      radiusMeters,
      stations: google.sort(byPriceThenDistance),
      notice: pricesAreLive
        ? "Live regular, midgrade, premium, and diesel prices come from Google when a station lists them. A blank grade means Google did not list that price."
        : "These are real stations from Google. Google did not list pump prices for them, so no price is shown.",
    };
  }

  const stations = (await nominatimStations(lat, lng, radiusMeters)).sort(byPriceThenDistance);
  const anyReported = stations.some((station) =>
    Object.values(station.prices).some((price) => price?.kind === "reported"),
  );
  return {
    source: "openstreetmap",
    pricesAreLive: false,
    fetchedAt,
    center: { lat, lng },
    radiusMeters,
    stations,
    notice: anyReported
      ? "Stations are real places from OpenStreetMap. A price marked Reported was tagged on the map. Every other price is an estimate, not a live pump price."
      : "Stations are real places from OpenStreetMap. Prices are estimates so you can compare the list. They are not live pump prices.",
  };
}

function byPriceThenDistance(a: FuelStation, b: FuelStation) {
  const aPrice = a.prices.regular?.amount ?? Number.POSITIVE_INFINITY;
  const bPrice = b.prices.regular?.amount ?? Number.POSITIVE_INFINITY;
  if (aPrice !== bPrice) return aPrice - bPrice;
  return a.distanceMeters - b.distanceMeters;
}
