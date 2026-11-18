import { randomInt } from "node:crypto";
import { connection } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import {
  drawGiveawayWinner,
  listGiveawayEntries,
  listGiveawayWinners,
  setGiveawayWinnerStatus,
} from "@/lib/db";
import { currentWeek, isWeekClosed, previousWeekKey, weekFromKey } from "@/lib/giveaway/week";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function gate(request: Request) {
  const result = checkAdmin(request);
  if (result === "missing") return json({ ok: false, message: "Set ADMIN_TOKEN on the server first." }, 503);
  if (result === "denied") return json({ ok: false, message: "That admin token does not match." }, 401);
  return null;
}

export async function GET(request: Request) {
  await connection();
  const blocked = gate(request);
  if (blocked) return blocked;
  const current = currentWeek();
  const requested = new URL(request.url).searchParams.get("week") ?? "";
  const week = weekFromKey(requested) ?? current;
  return json({
    ok: true,
    currentWeekKey: current.key,
    lastWeekKey: previousWeekKey(current.key),
    week: { key: week.key, opensAt: week.opensAt, closesAt: week.closesAt, closed: isWeekClosed(week.key) },
    entries: listGiveawayEntries(week.key),
    winners: listGiveawayWinners(),
  });
}

export async function POST(request: Request) {
  await connection();
  const blocked = gate(request);
  if (blocked) return blocked;
  let body: { action?: string; week?: string; id?: number; note?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, message: "Send JSON." }, 400);
  }

  if (body.action === "draw") {
    const week = weekFromKey(body.week ?? "");
    if (!week) return json({ ok: false, message: "Pick a week (its Monday, YYYY-MM-DD)." }, 400);
    if (!isWeekClosed(week.key)) {
      return json({ ok: false, message: "That week's entry period hasn't closed yet (Sunday 8 PM Central)." }, 400);
    }
    const result = drawGiveawayWinner(week.key, (n) => randomInt(n));
    return json(result, result.ok ? 200 : 400);
  }

  if (body.action === "paid" || body.action === "forfeit") {
    const id = Number(body.id);
    if (!Number.isInteger(id)) return json({ ok: false, message: "Missing winner id." }, 400);
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 200) : null;
    const ok = setGiveawayWinnerStatus(id, body.action === "paid" ? "paid" : "forfeited", note);
    return json(ok ? { ok: true } : { ok: false, message: "No winner with that id." }, ok ? 200 : 404);
  }

  return json({ ok: false, message: "Unknown action." }, 400);
}
