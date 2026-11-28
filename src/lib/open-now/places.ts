import { cached } from "@/lib/fuel/cache";
import { haversineMeters } from "@/lib/fuel/types";

const USER_AGENT = "LifeSaver/0.1 (open-near-me lookup; https://lifesaver-m3uv.onrender.com)";
const TEN_MINUTES = 10 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

export type OpenCategoryId =
  | "grocery"
  | "pharmacy"
  | "gas"
  | "food"
  | "coffee"
  | "convenience"
  | "hardware"
  | "clinic"
  | "bank"
  | "laundry"
  | "post"
  | "auto"
  | "vet";

/** OSM tag pairs for each category. Overpass uses all of them; Nominatim uses the value as a search phrase. */
export const OPEN_CATEGORIES: Record<OpenCategoryId, { label: string; emoji: string; tags: [string, string][] }> = {
  grocery: { label: "Groceries", emoji: "🛒", tags: [["shop", "supermarket"], ["shop", "grocery"]] },
  pharmacy: { label: "Pharmacy", emoji: "💊", tags: [["amenity", "pharmacy"]] },
  gas: { label: "Gas", emoji: "⛽", tags: [["amenity", "fuel"]] },
  food: { label: "Food", emoji: "🍔", tags: [["amenity", "fast_food"], ["amenity", "restaurant"]] },
  coffee: { label: "Coffee", emoji: "☕", tags: [["amenity", "cafe"]] },
  convenience: { label: "Convenience", emoji: "🥤", tags: [["shop", "convenience"]] },
  hardware: { label: "Hardware", emoji: "🔨", tags: [["shop", "hardware"], ["shop", "doityourself"]] },
  clinic: { label: "Clinic & ER", emoji: "🏥", tags: [["amenity", "clinic"], ["amenity", "hospital"]] },
  bank: { label: "Bank & ATM", emoji: "🏧", tags: [["amenity", "bank"], ["amenity", "atm"]] },
  laundry: { label: "Laundromat", emoji: "🧺", tags: [["shop", "laundry"]] },
  post: { label: "Post office", emoji: "📮", tags: [["amenity", "post_office"]] },
  auto: { label: "Auto repair", emoji: "🔧", tags: [["shop", "car_repair"], ["shop", "tyres"]] },
  vet: { label: "Vet", emoji: "🐾", tags: [["amenity", "veterinary"]] },
};

export function isOpenCategory(value: string): value is OpenCategoryId {
  return Object.prototype.hasOwnProperty.call(OPEN_CATEGORIES, value);
}

export type NearbyPlace = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  address: string | null;
  hours: string | null;
  phone: string | null;
  website: string | null;
  kind: string;
};

export type NearbyLookup = {
  source: "overpass" | "nominatim";
  center: { lat: number; lng: number };
  radiusMeters: number;
  fetchedAt: string;
  places: NearbyPlace[];
};

function cleanUrl(raw: string | undefined) {
  if (!raw) return null;
  const value = raw.split(";")[0].trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return `https://${value}`;
  return null;
}

function cleanPhone(raw: string | undefined) {
  if (!raw) return null;
  const value = raw.split(";")[0].trim();
  return /\d{7,}/.test(value.replace(/\D/g, "")) ? value.slice(0, 30) : null;
}

function tagAddress(tags: Record<string, string>) {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const city = tags["addr:city"];
  const line = [street, city].filter(Boolean).join(", ");
  return line || null;
}

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

async function overpassPlaces(category: OpenCategoryId, lat: number, lng: number, radiusMeters: number) {
  const filters = OPEN_CATEGORIES[category].tags
    .map(([k, v]) => `nwr["${k}"="${v}"]["name"](around:${Math.round(radiusMeters)},${lat.toFixed(5)},${lng.toFixed(5)});`)
    .join("");
  const query = `[out:json][timeout:15];(${filters});out center tags 150;`;
  const endpoints = ["https://overpass-api.de/api/interpreter"];
  let lastError: unknown = null;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "User-Agent": USER_AGENT, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }).toString(),
        signal: AbortSignal.timeout(9000),
      });
      if (!response.ok) throw new Error(`Overpass ${response.status}`);
      const body = (await response.json()) as { elements?: OverpassElement[] };
      const elements = Array.isArray(body.elements) ? body.elements : [];
      return elements.flatMap((el): NearbyPlace[] => {
        const tags = el.tags ?? {};
        const pLat = el.lat ?? el.center?.lat;
        const pLng = el.lon ?? el.center?.lon;
        if (pLat == null || pLng == null || !tags.name) return [];
        const kindPair = OPEN_CATEGORIES[category].tags.find(([k, v]) => tags[k] === v);
        return [
          {
            id: `${el.type}-${el.id}`,
            name: tags.name.slice(0, 80),
            lat: pLat,
            lng: pLng,
            distanceMeters: haversineMeters(lat, lng, pLat, pLng),
            address: tagAddress(tags),
            hours: tags.opening_hours?.slice(0, 300) ?? null,
            phone: cleanPhone(tags.phone ?? tags["contact:phone"]),
            website: cleanUrl(tags.website ?? tags["contact:website"]),
            kind: kindPair ? kindPair[1].replace(/_/g, " ") : category,
          },
        ];
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Overpass lookup failed.");
}

type NominatimPlace = {
  osm_type?: string;
  osm_id?: number;
  place_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  category?: string;
  type?: string;
  display_name?: string;
  extratags?: Record<string, string> | null;
};

async function nominatimPlaces(category: OpenCategoryId, lat: number, lng: number, radiusMeters: number) {
  const dLat = radiusMeters / 111320;
  const dLng = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  const out: NearbyPlace[] = [];
  let first = true;
  for (const [key, value] of OPEN_CATEGORIES[category].tags) {
    // Nominatim asks for at most one request a second.
    if (!first) await new Promise((resolve) => setTimeout(resolve, 1100));
    first = false;
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("amenity", value);
    url.searchParams.set("limit", "40");
    url.searchParams.set("bounded", "1");
    url.searchParams.set("extratags", "1");
    url.searchParams.set("viewbox", `${lng - dLng},${lat + dLat},${lng + dLng},${lat - dLat}`);
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) throw new Error("OpenStreetMap place search failed.");
    const rows = (await response.json()) as NominatimPlace[];
    for (const row of rows) {
      if (row.category !== key || row.type !== value || !row.name) continue;
      const pLat = Number(row.lat);
      const pLng = Number(row.lon);
      if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) continue;
      const tags = row.extratags ?? {};
      const address = row.display_name ? row.display_name.split(", ").slice(1, 4).join(", ") : null;
      out.push({
        id: row.osm_type && row.osm_id ? `${row.osm_type}-${row.osm_id}` : `n-${row.place_id}`,
        name: row.name.slice(0, 80),
        lat: pLat,
        lng: pLng,
        distanceMeters: haversineMeters(lat, lng, pLat, pLng),
        address,
        hours: tags.opening_hours?.slice(0, 300) ?? null,
        phone: cleanPhone(tags.phone ?? tags["contact:phone"]),
        website: cleanUrl(tags.website ?? tags["contact:website"]),
        kind: value.replace(/_/g, " "),
      });
    }
  }
  return out;
}

export async function geocodeZipForOpen(zip: string) {
  const result = await cached(`open-zip:${zip}`, ONE_DAY, async () => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("postalcode", zip);
    url.searchParams.set("country", "us");
    url.searchParams.set("limit", "1");
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) throw new Error("Could not look up that ZIP code.");
    const rows = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const pLat = Number(rows[0]?.lat);
    const pLng = Number(rows[0]?.lon);
    if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) throw new Error("That ZIP code did not match a place.");
    return { lat: pLat, lng: pLng };
  });
  return result.value;
}

export async function lookupNearby(input: {
  category: OpenCategoryId;
  lat?: number;
  lng?: number;
  zip?: string;
  radiusMeters: number;
}): Promise<NearbyLookup & { cached: boolean }> {
  const center =
    input.lat != null && input.lng != null ? { lat: input.lat, lng: input.lng } : await geocodeZipForOpen(input.zip || "");
  const { category, radiusMeters } = input;
  const key = `open:${category}:${center.lat.toFixed(3)}:${center.lng.toFixed(3)}:${radiusMeters}`;
  const result = await cached(key, TEN_MINUTES, async (): Promise<NearbyLookup> => {
    let source: NearbyLookup["source"] = "overpass";
    let places: NearbyPlace[];
    try {
      places = await overpassPlaces(category, center.lat, center.lng, radiusMeters);
    } catch {
      source = "nominatim";
      places = await nominatimPlaces(category, center.lat, center.lng, radiusMeters);
    }
    const seen = new Set<string>();
    const unique = places
      .filter((p) => p.distanceMeters <= radiusMeters * 1.05)
      .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 60);
    return { source, center, radiusMeters, fetchedAt: new Date().toISOString(), places: unique };
  });
  return { ...result.value, cached: result.cached };
}
