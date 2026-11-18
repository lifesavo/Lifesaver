// Weekly giveaway calendar. Every entry period runs Monday 12:00 AM to
// Sunday 8:00 PM, America/Chicago time. The week key is the Monday's date.

export const GIVEAWAY_TZ = "America/Chicago";
export const PRIZE_LABEL = "$100";

type Parts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function chicagoParts(instant: Date): Parts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: GIVEAWAY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant)) map[part.type] = part.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: WEEKDAYS[map.weekday] ?? 1,
  };
}

/** UTC instant for a wall-clock time in Chicago (handles CST/CDT). */
function chicagoToUtc(year: number, month: number, day: number, hour: number, minute = 0) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let instant = guess;
  for (let i = 0; i < 3; i += 1) {
    const p = chicagoParts(new Date(instant));
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    instant += guess - shown;
  }
  return new Date(instant);
}

function addDays(year: number, month: number, day: number, days: number) {
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function keyOf(date: { year: number; month: number; day: number }) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export type GiveawayWeek = {
  key: string; // Monday, YYYY-MM-DD
  opensAt: string; // ISO, Monday 12:00 AM CT
  closesAt: string; // ISO, Sunday 8:00 PM CT
};

export function weekFromKey(key: string): GiveawayWeek | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCDay() !== 1 || check.getUTCDate() !== day) return null; // must be a Monday
  const sunday = addDays(year, month, day, 6);
  return {
    key,
    opensAt: chicagoToUtc(year, month, day, 0).toISOString(),
    closesAt: chicagoToUtc(sunday.year, sunday.month, sunday.day, 20).toISOString(),
  };
}

/**
 * The week an entry made at `now` belongs to. Between Sunday 8 PM and
 * midnight entries are closed; they count toward the next Monday's week.
 */
export function currentWeek(now = new Date()): GiveawayWeek & { closedNow: boolean } {
  const p = chicagoParts(now);
  let monday = addDays(p.year, p.month, p.day, -(p.weekday - 1));
  const closedNow = p.weekday === 7 && p.hour >= 20;
  if (closedNow) monday = addDays(monday.year, monday.month, monday.day, 7);
  const week = weekFromKey(keyOf(monday))!;
  return { ...week, closedNow };
}

export function previousWeekKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return keyOf(addDays(y, m, d, -7));
}

export function isWeekClosed(key: string, now = new Date()) {
  const week = weekFromKey(key);
  return Boolean(week && now.getTime() >= new Date(week.closesAt).getTime());
}

export function formatChicago(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: GIVEAWAY_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}
