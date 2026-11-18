import { connection } from "next/server";
import {
  isFoundingEmail,
  listNightEvents,
  rsvpToEvent,
  voteForCity,
  voteRanking,
} from "@/lib/db";
import { metroForZip, metros } from "@/lib/metros";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const zip = url.searchParams.get("zip")?.trim() ?? "";
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const city = metroForZip(zip);
  const counts = new Map(voteRanking().map((row) => [row.cityId, row.n]));
  const ranking = metros
    .map((metro) => ({ id: metro.id, name: metro.name, votes: counts.get(metro.id) ?? 0 }))
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
  if (!city) {
    return json({
      ok: true,
      city: null,
      events: [],
      comingSoon: true,
      founding: email ? isFoundingEmail(email) : false,
      ranking,
    });
  }
  const events = listNightEvents(city.id, email);
  return json({
    ok: true,
    city: { id: city.id, name: city.name },
    events,
    comingSoon: events.length === 0,
    founding: email ? isFoundingEmail(email) : false,
    yourVotes: counts.get(city.id) ?? 0,
    ranking,
  });
}

export async function POST(request: Request) {
  await connection();
  let body: { action?: string; email?: string; cityId?: string; eventId?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, message: "Send JSON." }, 400);
  }
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, message: "Use the email from your LifeSaver profile." }, 400);
  }
  if (body.action === "vote") {
    const city = metros.find((metro) => metro.id === body.cityId);
    if (!city) return json({ ok: false, message: "Pick a city on the list." }, 400);
    const result = voteForCity(city.id, email);
    return json({ ok: true, city: city.name, ...result });
  }
  if (body.action === "rsvp") {
    const eventId = Number(body.eventId);
    if (!Number.isInteger(eventId)) return json({ ok: false, message: "Pick an event." }, 400);
    const result = rsvpToEvent(eventId, email);
    return json(result, result.ok ? 200 : 403);
  }
  return json({ ok: false, message: "Unknown action." }, 400);
}
