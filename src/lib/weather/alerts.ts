import { cached } from "@/lib/fuel/cache";

const USER_AGENT = "LifeSaver/0.1 (golifesaver.com weather alerts)";
const FIVE_MINUTES = 5 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

export type WeatherAlert = {
  id: string;
  event: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  urgency: string;
  certainty: string;
  headline: string;
  description: string;
  instruction: string | null;
  areaDesc: string;
  effective: string | null;
  expires: string | null;
  ends: string | null;
  senderName: string;
  url: string;
};

const SEVERITY_RANK: Record<WeatherAlert["severity"], number> = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };

export function sortAlerts(alerts: WeatherAlert[]) {
  return [...alerts].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || (a.expires ?? "").localeCompare(b.expires ?? ""));
}

type NwsFeature = { properties?: Record<string, unknown> };

function toAlert(f: NwsFeature): WeatherAlert | null {
  const p = f.properties ?? {};
  const s = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  if (!s("id") || s("status") !== "Actual") return null;
  const severity = (["Extreme", "Severe", "Moderate", "Minor"].includes(s("severity")) ? s("severity") : "Unknown") as WeatherAlert["severity"];
  return {
    id: s("id"),
    event: s("event"),
    severity,
    urgency: s("urgency"),
    certainty: s("certainty"),
    headline: s("headline") || s("event"),
    description: s("description").slice(0, 4000),
    instruction: s("instruction") ? s("instruction").slice(0, 2000) : null,
    areaDesc: s("areaDesc").slice(0, 400),
    effective: s("effective") || null,
    expires: s("expires") || null,
    ends: s("ends") || null,
    senderName: s("senderName"),
    url: typeof p["@id"] === "string" ? (p["@id"] as string) : "https://www.weather.gov/",
  };
}

/** Active NWS alerts covering a point (US only). Free, no key. */
export async function alertsAt(lat: number, lng: number): Promise<WeatherAlert[]> {
  const key = `alerts:${lat.toFixed(2)},${lng.toFixed(2)}`;
  const result = await cached(key, FIVE_MINUTES, async () => {
    const response = await fetch(`https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lng.toFixed(4)}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
    });
    if (!response.ok) throw new Error(response.status === 400 ? "Alerts are only available for US locations." : "The National Weather Service did not answer. Try again in a minute.");
    const body = (await response.json()) as { features?: NwsFeature[] };
    return sortAlerts((body.features ?? []).map(toAlert).filter((a): a is WeatherAlert => Boolean(a)));
  });
  return result.value;
}

/** Two-letter state for a point, from NWS /points. Best effort. */
export async function stateAt(lat: number, lng: number): Promise<string | null> {
  try {
    const result = await cached(`state:${lat.toFixed(1)},${lng.toFixed(1)}`, ONE_DAY, async () => {
      const response = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
      });
      if (!response.ok) return null;
      const body = (await response.json()) as { properties?: { relativeLocation?: { properties?: { state?: string } } } };
      return body.properties?.relativeLocation?.properties?.state ?? null;
    });
    return result.value;
  } catch {
    return null;
  }
}

/** State road-conditions / 511 sites. Others fall back to the FHWA directory. */
const DOT: Record<string, string> = {
  AZ: "https://www.az511.gov/",
  AR: "https://www.idrivearkansas.com/",
  CA: "https://quickmap.dot.ca.gov/",
  CO: "https://www.cotrip.org/",
  FL: "https://fl511.com/",
  GA: "https://511ga.org/",
  IA: "https://www.511ia.org/",
  IL: "https://www.gettingaroundillinois.com/",
  KS: "https://www.kandrive.gov/",
  KY: "https://goky.ky.gov/",
  LA: "https://www.511la.org/",
  MN: "https://511mn.org/",
  MO: "https://traveler.modot.org/map/",
  NE: "https://new.511.nebraska.gov/",
  NV: "https://www.nvroads.com/",
  NY: "https://511ny.org/",
  PA: "https://www.511pa.com/",
  TN: "https://smartway.tn.gov/",
  TX: "https://drivetexas.org/",
  UT: "https://udottraffic.utah.gov/",
  VA: "https://511.vdot.virginia.gov/",
  WA: "https://wsdot.com/travel/real-time/map/",
  WI: "https://511wi.gov/",
};

export function roadConditionsLink(state: string) {
  return { state, label: `${state} road conditions`, href: DOT[state] ?? "https://www.fhwa.dot.gov/trafficinfo/" };
}

/** Points along the straight line from a to b (inclusive of both ends). */
export function sampleLine(a: { lat: number; lng: number }, b: { lat: number; lng: number }, count: number) {
  const out: { lat: number; lng: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 1 : i / (count - 1);
    out.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
  }
  return out;
}
