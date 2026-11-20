import { connection } from "next/server";
import { json } from "@/lib/account-api";
import { isBeaconEvent, recordTrackedEvent, takeTrackRate } from "@/lib/track";
import { clientKey } from "@/lib/session";

async function readTrackBody(request: Request): Promise<Record<string, unknown> | null> {
  const type = request.headers.get("content-type") ?? "";
  const text = await request.text();
  if (!text) return null;
  if (type.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(text));
  }
  try {
    const body = JSON.parse(text) as unknown;
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** First-party click beacon. Unknown events are ignored. No IP or email is stored on the event. */
export async function POST(request: Request) {
  await connection();
  if (!takeTrackRate(clientKey(request))) {
    return json({ ok: false, message: "Too many events." }, 429);
  }
  const body = await readTrackBody(request);
  const event = body?.event;
  if (!isBeaconEvent(event)) {
    return json({ ok: true, ignored: true });
  }
  recordTrackedEvent(event, { utm_source: body?.utm_source, ref: body?.ref });
  return json({ ok: true });
}
