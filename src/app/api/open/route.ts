import { connection } from "next/server";
import { isOpenCategory, lookupNearby } from "@/lib/open-now/places";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const category = url.searchParams.get("cat") ?? "grocery";
  if (!isOpenCategory(category)) return json({ ok: false, message: "Pick a kind of place." }, 400);
  const latRaw = url.searchParams.get("lat");
  const lngRaw = url.searchParams.get("lng");
  const zip = url.searchParams.get("zip")?.trim() ?? "";
  const radiusRaw = Number(url.searchParams.get("radius") ?? "8047");
  const radiusMeters = Math.min(40234, Math.max(800, Number.isFinite(radiusRaw) ? radiusRaw : 8047));
  const lat = latRaw == null ? undefined : Number(latRaw);
  const lng = lngRaw == null ? undefined : Number(lngRaw);
  const hasPoint =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  if (!hasPoint && !/^\d{5}$/.test(zip)) {
    return json({ ok: false, message: "Share your location or type a 5-digit ZIP code." }, 400);
  }
  try {
    const lookup = await lookupNearby({
      category,
      lat: hasPoint ? lat : undefined,
      lng: hasPoint ? lng : undefined,
      zip: hasPoint ? undefined : zip,
      radiusMeters,
    });
    return json({ ok: true, ...lookup });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Place lookup failed.";
    return json({ ok: false, message }, 502);
  }
}
