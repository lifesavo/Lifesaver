/** Local receipt-reward tracker. LifeSaver does not connect to Fetch. */

export const RECEIPTS_KEY = "lifesaver.receipts.v1";
export const RECEIPTS_EVENT = "lifesaver-receipts";
export const MAX_TRIPS = 500;

/** Official Fetch destinations only. Fetch does not publish a public API or a documented scanner deep link. */
export const FETCH_SITE = "https://fetch.com/";
export const FETCH_FAQ = "https://fetch.com/faq";
export const FETCH_REFERRAL_INFO = "https://fetch.com/referral";
export const FETCH_APP_STORE = "https://apps.apple.com/us/app/fetch-earn-rewards-every-day/id1182474649";
export const FETCH_PLAY_STORE = "https://play.google.com/store/apps/details?id=com.fetchrewards.fetchrewards.hop";

export type ReceiptSource = "grocery" | "budget" | "manual";

export type ReceiptTrip = {
  id: string;
  date: string;
  store: string;
  note: string;
  source: ReceiptSource;
  scanned: boolean;
  /** Points the user typed from Fetch. Never fetched automatically. */
  points: number;
  /** Optional dollar amount the user typed (for example after redeeming). */
  value: number;
  created: number;
};

export type ReceiptsState = { trips: ReceiptTrip[] };

const EMPTY: ReceiptsState = { trips: [] };

export function newReceiptId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function todayKey() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fetchReferralCode() {
  return (process.env.NEXT_PUBLIC_FETCH_REFERRAL_CODE || "").trim();
}

/** Official App Store or Play listing on phones; Fetch's site otherwise. */
export function officialFetchOpenUrl() {
  if (typeof navigator === "undefined") return FETCH_SITE;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return FETCH_APP_STORE;
  if (/Android/i.test(ua)) return FETCH_PLAY_STORE;
  return FETCH_SITE;
}

function asTrip(raw: unknown): ReceiptTrip | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Partial<ReceiptTrip>;
  if (typeof t.id !== "string" || typeof t.date !== "string") return null;
  const source: ReceiptSource = t.source === "grocery" || t.source === "budget" || t.source === "manual" ? t.source : "manual";
  const points = typeof t.points === "number" && Number.isFinite(t.points) ? Math.max(0, Math.round(t.points)) : 0;
  const value = typeof t.value === "number" && Number.isFinite(t.value) ? Math.max(0, Math.round(t.value * 100) / 100) : 0;
  return {
    id: t.id,
    date: t.date.slice(0, 10),
    store: typeof t.store === "string" ? t.store.slice(0, 60) : "",
    note: typeof t.note === "string" ? t.note.slice(0, 120) : "",
    source,
    scanned: Boolean(t.scanned),
    points,
    value,
    created: typeof t.created === "number" ? t.created : Date.now(),
  };
}

export function parseReceipts(raw: string | null | undefined): ReceiptsState {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as Partial<ReceiptsState>;
    const trips = Array.isArray(parsed.trips) ? parsed.trips.map(asTrip).filter((t): t is ReceiptTrip => Boolean(t)) : [];
    return { trips };
  } catch {
    return EMPTY;
  }
}

export function readReceipts(): ReceiptsState {
  if (typeof window === "undefined") return EMPTY;
  try {
    return parseReceipts(localStorage.getItem(RECEIPTS_KEY));
  } catch {
    return EMPTY;
  }
}

export function writeReceipts(state: ReceiptsState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify({ trips: state.trips.slice(0, MAX_TRIPS) }));
    window.dispatchEvent(new Event(RECEIPTS_EVENT));
  } catch {
    // Storage full or blocked; the list still works for this visit.
  }
}

export function addReceiptTrip(input: {
  date: string;
  store?: string;
  note?: string;
  source?: ReceiptSource;
  scanned?: boolean;
  points?: number;
  value?: number;
}): ReceiptTrip {
  const trip: ReceiptTrip = {
    id: newReceiptId(),
    date: (input.date || todayKey()).slice(0, 10),
    store: (input.store || "").trim().replace(/\s+/g, " ").slice(0, 60),
    note: (input.note || "").trim().replace(/\s+/g, " ").slice(0, 120),
    source: input.source || "manual",
    scanned: Boolean(input.scanned),
    points: typeof input.points === "number" && Number.isFinite(input.points) ? Math.max(0, Math.round(input.points)) : 0,
    value: typeof input.value === "number" && Number.isFinite(input.value) ? Math.max(0, Math.round(input.value * 100) / 100) : 0,
    created: Date.now(),
  };
  const prev = readReceipts();
  writeReceipts({ trips: [trip, ...prev.trips].slice(0, MAX_TRIPS) });
  return trip;
}

export function updateReceiptTrip(id: string, patch: Partial<Omit<ReceiptTrip, "id" | "created">>) {
  const prev = readReceipts();
  writeReceipts({
    trips: prev.trips.map((t) => (t.id === id ? { ...t, ...patch, id: t.id, created: t.created } : t)),
  });
}

export function removeReceiptTrip(id: string) {
  const prev = readReceipts();
  writeReceipts({ trips: prev.trips.filter((t) => t.id !== id) });
}

export function hasTripOn(date: string, source: ReceiptSource) {
  return readReceipts().trips.some((t) => t.date === date && t.source === source);
}

export function receiptTotals(trips: ReceiptTrip[]) {
  let points = 0;
  let value = 0;
  let scanned = 0;
  let pending = 0;
  for (const t of trips) {
    points += t.points;
    value += t.value;
    if (t.scanned) scanned += 1;
    else pending += 1;
  }
  return { points, value, scanned, pending, count: trips.length };
}

function icsEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Weekly Sunday reminder to snap receipts still sitting around. */
export function downloadWeeklyScanReminder() {
  if (typeof document === "undefined") return;
  const now = new Date();
  const daysUntilSun = (7 - now.getDay()) % 7;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSun);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startKey = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}`;
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  const endKey = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const summary = "Snap receipts in Fetch";
  const description =
    "A LifeSaver reminder to open the Fetch app and snap any receipts you have not scanned yet. Fetch says physical receipts must be snapped within 14 days of the checkout date, and you can snap up to 35 receipts in a 7-day rolling period. LifeSaver is not affiliated with Fetch Rewards.";
  const ics =
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//LifeSaver//Receipts//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:receipts-weekly-scan@lifesaver`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${startKey}`,
      `DTEND;VALUE=DATE:${endKey}`,
      "RRULE:FREQ=WEEKLY;BYDAY=SU",
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(description)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(summary)}`,
      "TRIGGER:PT10H",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n") + "\r\n";
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "lifesaver-fetch-receipt-reminder.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
