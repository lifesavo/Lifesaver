import { createRoadsideRequest } from "@/lib/db";
import { PICKER_ISSUES, type RoadsideIssue } from "@/lib/roadside/info";

const PHONE = /^[+()\d\s.-]{7,20}$/;

/** Validates and creates a roadside help request. Shared by the web route and the MCP tool. */
export function submitRoadsideRequest(ownerId: string, body: Record<string, unknown>) {
  const issue = String(body.issue ?? "") as RoadsideIssue;
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const name = String(body.name ?? "").trim().replace(/[^\p{L} '.-]/gu, "").slice(0, 40);
  const phone = String(body.phone ?? "").trim();
  const note = String(body.note ?? "").trim().slice(0, 300) || null;
  if (!PICKER_ISSUES.includes(issue) && issue !== "wont_start") return { ok: false as const, message: "Pick what happened." };
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ok: false as const, message: "Share your location so nearby helpers can find you." };
  }
  if (name.length < 1) return { ok: false as const, message: "Add your first name." };
  if (!PHONE.test(phone) || phone.replace(/\D/g, "").length < 10) return { ok: false as const, message: "Add a phone number a helper can call or text." };
  return createRoadsideRequest({ ownerId, issue, lat, lng, note, name, phone });
}
