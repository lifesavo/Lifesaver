import { connection } from "next/server";
import { lookupFuel } from "@/lib/fuel/providers";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const latRaw = url.searchParams.get("lat");
  const lngRaw = url.searchParams.get("lng");
  const zip = url.searchParams.get("zip")?.trim() ?? "";
  const radiusRaw = Number(url.searchParams.get("radius") ?? "4828");
  const radiusMeters = Math.min(25000, Math.max(800, Number.isFinite(radiusRaw) ? radiusRaw : 4828));

  const lat = latRaw == null ? undefined : Number(latRaw);
  const lng = lngRaw == null ? undefined : Number(lngRaw);
  const hasPoint = lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  if (!hasPoint && !/^\d{5}$/.test(zip)) {
    return json({ ok: false, message: "Share a location or a 5-digit ZIP code." }, 400);
  }

  try {
    const lookup = await lookupFuel({
      lat: hasPoint ? lat : undefined,
      lng: hasPoint ? lng : undefined,
      zip: hasPoint ? undefined : zip,
      radiusMeters,
    });
    return json({ ok: true, ...lookup });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fuel lookup failed.";
    return json({ ok: false, message }, 502);
  }
}
