import { connection } from "next/server";
import { takeGiveawayRate } from "@/lib/db";
import { buildItinerary, normalizeInput, parseTripRequest, type PlanInput } from "@/lib/travel/itinerary";
import { enrichItinerary, enrichmentAvailable } from "@/lib/travel/enrich";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  await connection();
  let payload: Partial<PlanInput> & { text?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return json({ ok: false, message: "Send the trip as JSON." }, 400);
  }
  let input: Partial<PlanInput> = payload;
  if (typeof payload.text === "string" && payload.text.trim()) {
    const parsed = parseTripRequest(payload.text.slice(0, 400));
    if (parsed.missing.length) {
      return json({ ok: false, parsed, message: `Tell me the ${parsed.missing.join(" and ")} and I'll plan it.` }, 400);
    }
    input = { ...parsed, ...Object.fromEntries(Object.entries(payload).filter(([k, v]) => k !== "text" && v != null && v !== "")) };
  }
  const normalized = normalizeInput(input);
  if (typeof normalized === "string") return json({ ok: false, message: normalized }, 400);
  let plan = buildItinerary(normalized);
  if (enrichmentAvailable()) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    let allowed = false;
    try {
      allowed = takeGiveawayRate(`itinerary:${ip}`, 10);
    } catch {
      allowed = false;
    }
    if (allowed) plan = await enrichItinerary(plan);
  }
  return json({ ok: true, plan });
}
