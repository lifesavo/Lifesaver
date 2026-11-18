import { alertsAt, roadConditionsLink, sampleLine, sortAlerts, stateAt, type WeatherAlert } from "@/lib/weather/alerts";
import { geocodeUs } from "@/lib/weather/fetch";

export type TripAlerts = {
  destination: { name: string; alerts: WeatherAlert[] };
  route: { checkedPoints: number; alerts: (WeatherAlert & { near: string })[] } | null;
  roads: { state: string; label: string; href: string }[];
  note: string;
};

export async function tripAlerts(destination: string, origin?: string): Promise<TripAlerts> {
  const dest = await geocodeUs(destination);
  const destAlerts = await alertsAt(dest.lat, dest.lng);
  let route: TripAlerts["route"] = null;
  const states = new Set<string>();
  const destState = await stateAt(dest.lat, dest.lng);
  if (destState) states.add(destState);
  if (origin && origin.trim().length >= 2) {
    try {
      const from = await geocodeUs(origin);
      const points = sampleLine(from, dest, 5).slice(0, 4); // origin + 3 points along the way; destination is above
      const seen = new Set(destAlerts.map((a) => a.id));
      const found: (WeatherAlert & { near: string })[] = [];
      const results = await Promise.all(
        points.map(async (pt, index) => {
          const [alerts, state] = await Promise.all([alertsAt(pt.lat, pt.lng).catch(() => []), stateAt(pt.lat, pt.lng)]);
          return { alerts, state, near: index === 0 ? from.name : `${Math.round(((index) / 4) * 100)}% of the way` };
        }),
      );
      for (const r of results) {
        if (r.state) states.add(r.state);
        for (const a of r.alerts) {
          if (seen.has(a.id)) continue;
          seen.add(a.id);
          found.push({ ...a, near: r.near });
        }
      }
      route = { checkedPoints: points.length, alerts: sortAlerts(found) as (WeatherAlert & { near: string })[] };
    } catch {
      route = null;
    }
  }
  return {
    destination: { name: dest.name, alerts: destAlerts },
    route,
    roads: [...states].map(roadConditionsLink),
    note: "Alerts come from the National Weather Service. The route check samples a few points on a straight line, not your actual roads, so check the state road-conditions sites before you go.",
  };
}
