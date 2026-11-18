import { createRoadsideRequest, type HelpDetails, type HelpKind } from "@/lib/db";
import { PRO_CATEGORIES, URGENCY } from "@/lib/help/types";
import { PICKER_ISSUES, type RoadsideIssue } from "@/lib/roadside/info";
import { geocodeUs } from "@/lib/weather/fetch";

const PHONE = /^[+()\d\s.-]{7,20}$/;
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Validates and creates a Get a Hand request (roadside, ride, or pro help). Shared by the web route and the MCP tool. */
export async function submitHelpRequest(ownerId: string, body: Record<string, unknown>) {
  const kind = (["roadside", "ride", "pro"].includes(String(body.type ?? body.kind)) ? String(body.type ?? body.kind) : "roadside") as HelpKind;
  const name = clean(body.name, 40).replace(/[^\p{L} '.-]/gu, "");
  const phone = clean(body.phone, 20);
  const note = clean(body.note ?? body.description, 500) || null;
  let issue = clean(body.issue ?? body.category, 30);
  const details: HelpDetails = {};

  if (kind === "roadside") {
    if (!PICKER_ISSUES.includes(issue as RoadsideIssue) && issue !== "wont_start") return { ok: false as const, message: "Pick what happened." };
  } else if (kind === "ride") {
    issue = "ride";
    details.pickup = clean(body.pickup, 160);
    details.dropoff = clean(body.dropoff, 160);
    details.when = clean(body.when, 40) || "As soon as possible";
    const riders = Math.round(Number(body.riders ?? 1));
    details.riders = Number.isFinite(riders) ? Math.min(8, Math.max(1, riders)) : 1;
    if (details.pickup.length < 3 || details.dropoff.length < 3) return { ok: false as const, message: "Add a pickup and a drop-off address." };
  } else {
    if (!PRO_CATEGORIES.some((c) => c.id === issue)) issue = "other";
    details.category = issue;
    details.address = clean(body.address, 160) || undefined;
    const urgency = clean(body.urgency, 20);
    details.urgency = (URGENCY.some((u) => u.id === urgency) ? urgency : "flexible") as HelpDetails["urgency"];
    if (!note || note.length < 5) return { ok: false as const, message: "Describe what you need help with." };
  }

  let lat = Number(body.lat);
  let lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (body.lat == null && body.lng == null)) {
    const zip = clean(body.zip, 60);
    if (zip.length >= 2) {
      try {
        const place = await geocodeUs(zip);
        lat = place.lat;
        lng = place.lng;
      } catch {
        return { ok: false as const, message: "We couldn't find that ZIP or city." };
      }
    } else {
      return { ok: false as const, message: "Share your location or add a ZIP so nearby helpers can find you." };
    }
  }
  if (name.length < 1) return { ok: false as const, message: "Add your first name." };
  if (!PHONE.test(phone) || phone.replace(/\D/g, "").length < 10) return { ok: false as const, message: "Add a phone number a helper can call or text." };

  let photo: string | null = null;
  if (kind === "pro" && typeof body.photo === "string" && body.photo) {
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(body.photo) || body.photo.length > 450_000) {
      return { ok: false as const, message: "That photo is too big or not an image. Try a smaller one." };
    }
    photo = body.photo;
  }
  return createRoadsideRequest({ ownerId, kind, issue, lat, lng, note, name, phone, details, photo });
}

/** Back-compat name used by the roadside screens and tools. */
export const submitRoadsideRequest = (ownerId: string, body: Record<string, unknown>) => submitHelpRequest(ownerId, { ...body, type: "roadside" });
