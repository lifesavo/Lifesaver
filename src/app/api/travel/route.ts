import { connection } from "next/server";
import { parseTrip } from "@/lib/travel/search";
import { searchTrip } from "@/lib/travel/search";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  await connection();
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, message: "Send the trip as JSON." }, 400);
  }
  const parsed = parseTrip((payload ?? {}) as Partial<import("@/lib/travel/types").TripQuery>);
  if (typeof parsed === "string") return json({ ok: false, message: parsed }, 400);
  try {
    const result = await searchTrip(parsed);
    return json({ ok: true, query: parsed, ...result });
  } catch {
    return json({ ok: false, message: "The travel search failed. Try again." }, 502);
  }
}
