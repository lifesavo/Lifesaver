import { connection } from "next/server";
import { deleteUserTrip, listUserTrips, saveUserTrip } from "@/lib/db";
import { bearer, requestOwner } from "@/lib/owner";
import type { Itinerary } from "@/lib/travel/itinerary";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const NO_AUTH = { ok: false, message: "Send your LifeSaver personal access token as 'Authorization: Bearer <token>'." };

export async function GET(request: Request) {
  await connection();
  const owner = await requestOwner(request);
  if (!owner) return bearer(request) ? json(NO_AUTH, 401) : json({ ok: true, trips: [] });
  return json({ ok: true, trips: listUserTrips(owner) });
}

export async function POST(request: Request) {
  await connection();
  const owner = await requestOwner(request, !bearer(request));
  if (!owner) return json(NO_AUTH, 401);
  let trip: Partial<Itinerary>;
  try {
    trip = (await request.json()) as Partial<Itinerary>;
  } catch {
    return json({ ok: false, message: "Send the trip as JSON." }, 400);
  }
  if (typeof trip.id !== "string" || !/^trip-[a-z0-9]{1,20}$/.test(trip.id) || !Array.isArray(trip.days) || !trip.input) {
    return json({ ok: false, message: "That doesn't look like a LifeSaver trip." }, 400);
  }
  if (!saveUserTrip(owner, trip.id, trip)) return json({ ok: false, message: "You have 50 saved trips. Delete one first." }, 409);
  return json({ ok: true });
}

export async function DELETE(request: Request) {
  await connection();
  const owner = await requestOwner(request);
  if (!owner) return json(NO_AUTH, 401);
  const id = new URL(request.url).searchParams.get("id") ?? "";
  return json({ ok: true, deleted: deleteUserTrip(owner, id) });
}
