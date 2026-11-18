import { createHash, timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { createNightEvent } from "@/lib/db";
import { metros } from "@/lib/metros";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function authorized(request: Request) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return "missing" as const;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const presented = bearer || request.headers.get("x-admin-token")?.trim() || "";
  if (!presented) return "denied" as const;
  const left = createHash("sha256").update(presented).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right) ? "ok" as const : "denied" as const;
}

export async function POST(request: Request) {
  await connection();
  const gate = authorized(request);
  if (gate === "missing") return json({ ok: false, message: "Set ADMIN_TOKEN before posting events." }, 503);
  if (gate === "denied") return json({ ok: false, message: "That admin token does not match." }, 401);

  let body: {
    cityId?: string;
    kind?: string;
    eventDate?: string;
    venue?: string;
    deal?: string;
    capacity?: number;
    publicRsvp?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, message: "Send the event as JSON." }, 400);
  }
  const city = metros.find((metro) => metro.id === body.cityId);
  const kind = body.kind === "guys" ? "guys" : body.kind === "girls" ? "girls" : "";
  const eventDate = body.eventDate?.trim() ?? "";
  const venue = body.venue?.trim() ?? "";
  const deal = body.deal?.trim() ?? "";
  const capacity = Number(body.capacity);
  if (!city || !kind || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || venue.length < 2 || deal.length < 2) {
    return json({ ok: false, message: "City, night, date, venue, and deal are required." }, 400);
  }
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
    return json({ ok: false, message: "Capacity should be between 1 and 500." }, 400);
  }
  const id = createNightEvent({
    cityId: city.id,
    kind,
    eventDate,
    venue,
    deal,
    capacity,
    publicRsvp: Boolean(body.publicRsvp),
  });
  return json({ ok: true, id, city: city.name });
}
