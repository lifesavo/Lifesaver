import { connection } from "next/server";
import { tripAlerts } from "@/lib/weather/trip-alerts";

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const destination = url.searchParams.get("destination")?.trim() ?? "";
  const origin = url.searchParams.get("origin")?.trim() ?? "";
  if (destination.length < 2) return Response.json({ ok: false, message: "Add a destination." }, { status: 400 });
  try {
    return Response.json({ ok: true, ...(await tripAlerts(destination.slice(0, 80), origin.slice(0, 80) || undefined)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    return Response.json({ ok: false, message: cause instanceof Error ? cause.message : "Alert lookup failed." }, { status: 502 });
  }
}
