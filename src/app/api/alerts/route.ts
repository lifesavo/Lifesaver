import { connection } from "next/server";
import { alertsAt } from "@/lib/weather/alerts";
import { geocodeUs } from "@/lib/weather/fetch";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } });
}

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const q = url.searchParams.get("q")?.trim() ?? "";
  try {
    if (url.searchParams.has("lat") && Number.isFinite(lat) && Number.isFinite(lng)) {
      return json({ ok: true, place: null, alerts: await alertsAt(lat, lng), source: "National Weather Service" });
    }
    if (q.length >= 2) {
      const place = await geocodeUs(q);
      return json({ ok: true, place: place.name, alerts: await alertsAt(place.lat, place.lng), source: "National Weather Service" });
    }
    return json({ ok: false, message: "Share your location or enter a ZIP or city." }, 400);
  } catch (cause) {
    return json({ ok: false, message: cause instanceof Error ? cause.message : "Alert lookup failed." }, 502);
  }
}
