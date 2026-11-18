import { connection } from "next/server";
import { acceptRoadside, getRoadsideRequest, listMyRoadside, listOpenRoadside, roadsidePhoto, takeGiveawayRate, updateRoadside } from "@/lib/db";
import { requestOwner } from "@/lib/owner";
import { submitHelpRequest } from "@/lib/roadside/requests";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function ip(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function miles(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 3958.8;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * GET ?id=rh_...      one request (requester sees status + helper; others see approximate location)
 * GET ?mine=1         my requests and the ones I accepted
 * GET ?lat=&lng=      open requests within 50 miles, nearest first (helpers)
 */
export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const viewer = await requestOwner(request);
  const id = url.searchParams.get("id");
  if (id && url.searchParams.get("photo")) {
    const photo = roadsidePhoto(id);
    const m = photo?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!m) return new Response("Not found", { status: 404 });
    return new Response(Buffer.from(m[2], "base64"), { headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=300" } });
  }
  if (id) {
    const found = getRoadsideRequest(id, viewer);
    return found ? json({ ok: true, request: found }) : json({ ok: false, message: "Request not found." }, 404);
  }
  if (url.searchParams.get("mine")) return json({ ok: true, requests: viewer ? listMyRoadside(viewer) : [] });
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!url.searchParams.has("lat") || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return json({ ok: false, message: "Share your location to see requests near you." }, 400);
  }
  const radius = Math.min(100, Math.max(5, Number(url.searchParams.get("radius")) || 50));
  const type = url.searchParams.get("type");
  const requests = listOpenRoadside(viewer)
    .filter((r) => !type || type === "all" || r.kind === type)
    .map((r) => ({ ...r, miles: Math.round(miles(lat, lng, r.lat, r.lng) * 10) / 10 }))
    .filter((r) => r.miles <= radius)
    .sort((a, b) => a.miles - b.miles)
    .slice(0, 50);
  return json({ ok: true, radius, requests });
}

export async function POST(request: Request) {
  await connection();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, message: "Send the request as JSON." }, 400);
  }
  if (!takeGiveawayRate(`roadside:${ip(request)}`, 6)) return json({ ok: false, message: "Too many requests from here. If you're in danger, call 911." }, 429);
  const owner = await requestOwner(request, true);
  if (!owner) return json({ ok: false, message: "That token is not valid." }, 401);
  const result = await submitHelpRequest(owner, body);
  return json(result, result.ok ? 200 : 400);
}

/** PATCH { id, action: "accept" | "done" | "cancel" | "release", name?, phone? } */
export async function PATCH(request: Request) {
  await connection();
  let body: { id?: unknown; action?: unknown; name?: unknown; phone?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, message: "Send JSON." }, 400);
  }
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  if (action === "accept") {
    const owner = await requestOwner(request, true);
    if (!owner) return json({ ok: false, message: "That token is not valid." }, 401);
    const name = String(body.name ?? "").trim().replace(/[^\p{L} '.-]/gu, "").slice(0, 40);
    const phone = String(body.phone ?? "").trim();
    if (!name || phone.replace(/\D/g, "").length < 10) return json({ ok: false, message: "Add your first name and a phone number so they can reach you." }, 400);
    const result = acceptRoadside(id, { ownerId: owner, name, phone });
    return json(result, result.ok ? 200 : 409);
  }
  if (action !== "done" && action !== "cancel" && action !== "release") return json({ ok: false, message: "Unknown action." }, 400);
  const owner = await requestOwner(request);
  if (!owner) return json({ ok: false, message: "Only the requester or the helper can change this." }, 403);
  const result = updateRoadside(id, owner, action);
  return json(result, result.ok ? 200 : 409);
}
