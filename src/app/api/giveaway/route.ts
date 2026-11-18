import { connection } from "next/server";
import {
  countGiveawayEntries,
  enterGiveaway,
  hasGiveawayEntry,
  publicWinnerFor,
  takeGiveawayRate,
} from "@/lib/db";
import { currentWeek, previousWeekKey } from "@/lib/giveaway/week";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME = /^[\p{L}][\p{L} '.-]{0,39}$/u;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

function winnerLabel(row: { firstName: string | null; lastInitial: string | null } | null) {
  if (!row) return null;
  if (!row.firstName) return "A LifeSaver member";
  return row.lastInitial ? `${row.firstName} ${row.lastInitial}.` : row.firstName;
}

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const week = currentWeek();
  return json({
    ok: true,
    week: { key: week.key, opensAt: week.opensAt, closesAt: week.closesAt, closedNow: week.closedNow },
    entered: email && EMAIL.test(email) ? hasGiveawayEntry(week.key, email) : false,
    entrants: countGiveawayEntries(week.key),
    lastWinner: winnerLabel(publicWinnerFor(previousWeekKey(week.key))),
  });
}

export async function POST(request: Request) {
  await connection();
  let body: {
    email?: unknown;
    firstName?: unknown;
    lastInitial?: unknown;
    method?: unknown;
    eligible?: unknown;
    company?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, message: "Send your entry as JSON." }, 400);
  }
  const week = currentWeek();

  // Honeypot: bots fill the hidden field. Pretend it worked.
  if (typeof body.company === "string" && body.company.trim()) {
    return json({ ok: true, already: false, entered: true, weekKey: week.key });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastInitial =
    typeof body.lastInitial === "string" ? body.lastInitial.trim().slice(0, 1).toUpperCase() : "";
  const method = body.method === "amoe" ? "amoe" : "app";

  if (!email || email.length > 254 || !EMAIL.test(email)) {
    return json({ ok: false, message: "Enter an email like alex@example.com." }, 400);
  }
  if (!NAME.test(firstName)) {
    return json({ ok: false, message: "Enter your first name." }, 400);
  }
  if (!/^\p{L}$/u.test(lastInitial)) {
    return json({ ok: false, message: "Enter the first letter of your last name." }, 400);
  }
  if (body.eligible !== true) {
    return json({ ok: false, message: "Confirm you're a legal U.S. resident, 18 or older." }, 400);
  }

  if (!takeGiveawayRate(`ip:${clientIp(request)}`, 10) || !takeGiveawayRate(`email:${email}`, 5)) {
    return json({ ok: false, message: "Too many tries. Wait an hour and try again." }, 429);
  }

  const result = enterGiveaway({ weekKey: week.key, email, firstName, lastInitial, method });
  return json({
    ok: true,
    already: result.already,
    entered: true,
    weekKey: week.key,
    closesAt: week.closesAt,
    entrants: countGiveawayEntries(week.key),
  });
}
