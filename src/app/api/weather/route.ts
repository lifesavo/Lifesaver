import { connection } from "next/server";
import { forecast, geocodeUs } from "@/lib/weather/fetch";
import { pickOutfit } from "@/lib/weather/outfit";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const q = url.searchParams.get("q")?.trim() ?? "";
  try {
    let report;
    if (url.searchParams.has("lat") && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      report = await forecast(lat, lng);
    } else if (q.length >= 2) {
      const place = await geocodeUs(q);
      report = await forecast(place.lat, place.lng, place.name);
    } else {
      return json({ ok: false, message: "Share your location or enter a ZIP or city." }, 400);
    }
    return json({ ok: true, report, outfit: pickOutfit(report) });
  } catch (cause) {
    return json({ ok: false, message: cause instanceof Error ? cause.message : "Weather lookup failed." }, 502);
  }
}
