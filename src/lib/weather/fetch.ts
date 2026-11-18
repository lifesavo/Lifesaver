import { cached } from "@/lib/fuel/cache";
import type { WeatherReport } from "@/lib/weather/outfit";

const USER_AGENT = "LifeSaver/0.1 (golifesaver.com weather; contact: support@golifesaver.com)";
const TEN_MINUTES = 10 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

export type Place = { lat: number; lng: number; name: string };

/** ZIP (zippopotam.us) or US city name (Open-Meteo geocoding). Both free, no key. */
export async function geocodeUs(query: string): Promise<Place> {
  const q = query.trim().slice(0, 80);
  const result = await cached(`wx-geo:${q.toLowerCase()}`, ONE_DAY, async () => {
    const zip = q.match(/^\d{5}$/);
    if (zip) {
      const response = await fetch(`https://api.zippopotam.us/us/${zip[0]}`, { headers: { "User-Agent": USER_AGENT } });
      if (!response.ok) throw new Error("That ZIP code did not match a place.");
      const body = (await response.json()) as { places?: Array<{ "place name"?: string; "state abbreviation"?: string; latitude?: string; longitude?: string }> };
      const place = body.places?.[0];
      const lat = Number(place?.latitude);
      const lng = Number(place?.longitude);
      if (!place || !Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("That ZIP code did not match a place.");
      return { lat, lng, name: `${place["place name"]}, ${place["state abbreviation"]}` };
    }
    const [cityPart, statePart] = q.split(",").map((part) => part.trim());
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", cityPart);
    url.searchParams.set("count", "10");
    url.searchParams.set("countryCode", "US");
    url.searchParams.set("language", "en");
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) throw new Error("Could not look up that city.");
    const body = (await response.json()) as { results?: Array<{ name: string; latitude: number; longitude: number; admin1?: string; admin1_code?: string }> };
    const rows = body.results ?? [];
    const wanted = statePart?.toLowerCase();
    const row = (wanted && rows.find((r) => r.admin1?.toLowerCase() === wanted || r.admin1_code?.toLowerCase() === wanted || r.admin1?.toLowerCase().startsWith(wanted))) || rows[0];
    if (!row) throw new Error("That city did not match a US place. Try a ZIP code.");
    return { lat: row.latitude, lng: row.longitude, name: `${row.name}${row.admin1 ? `, ${row.admin1}` : ""}` };
  });
  return result.value;
}

/** Reverse lookup for a friendly name from browser coordinates. Best effort. */
async function nameFor(lat: number, lng: number) {
  try {
    const result = await cached(`wx-rev:${lat.toFixed(2)},${lng.toFixed(2)}`, ONE_DAY, async () => {
      const response = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
      });
      if (!response.ok) return "Your location";
      const body = (await response.json()) as { properties?: { relativeLocation?: { properties?: { city?: string; state?: string } } } };
      const rel = body.properties?.relativeLocation?.properties;
      return rel?.city ? `${rel.city}, ${rel.state ?? ""}`.replace(/, $/, "") : "Your location";
    });
    return result.value;
  } catch {
    return "Your location";
  }
}

export async function forecast(lat: number, lng: number, name?: string): Promise<WeatherReport> {
  const key = `wx:${lat.toFixed(2)},${lng.toFixed(2)}`;
  const result = await cached(key, TEN_MINUTES, async () => {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lat.toFixed(4));
    url.searchParams.set("longitude", lng.toFixed(4));
    url.searchParams.set("current", "temperature_2m,apparent_temperature,precipitation,snowfall,weather_code,wind_speed_10m");
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,snowfall_sum,wind_speed_10m_max,weather_code");
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("wind_speed_unit", "mph");
    url.searchParams.set("precipitation_unit", "inch");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "1");
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) throw new Error("The weather service did not answer. Try again in a minute.");
    const body = (await response.json()) as {
      timezone?: string;
      current?: { time: string; temperature_2m: number; apparent_temperature: number; precipitation: number; snowfall: number; weather_code: number; wind_speed_10m: number };
      daily?: {
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: Array<number | null>;
        precipitation_sum: number[];
        snowfall_sum: number[];
        wind_speed_10m_max: number[];
        weather_code: number[];
      };
    };
    const c = body.current;
    const d = body.daily;
    if (!c || !d) throw new Error("The weather service sent an empty forecast.");
    return {
      lat,
      lng,
      timezone: body.timezone ?? "",
      observedAt: c.time,
      current: { temp: c.temperature_2m, feelsLike: c.apparent_temperature, code: c.weather_code, wind: c.wind_speed_10m, precip: c.precipitation, snowfall: c.snowfall },
      today: {
        high: d.temperature_2m_max[0],
        low: d.temperature_2m_min[0],
        code: d.weather_code[0],
        precipChance: d.precipitation_probability_max[0] ?? 0,
        precipInches: d.precipitation_sum[0] ?? 0,
        // Open-Meteo reports snowfall in cm even with inch precipitation units.
        snowInches: (d.snowfall_sum[0] ?? 0) / 2.54,
        windMax: d.wind_speed_10m_max[0] ?? 0,
      },
      source: "Open-Meteo",
    };
  });
  const place = name ?? (await nameFor(lat, lng));
  return { ...result.value, place };
}
