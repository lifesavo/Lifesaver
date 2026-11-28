/**
 * Small reader for OpenStreetMap "opening_hours" text, covering the common forms
 * ("24/7", "Mo-Fr 08:00-18:00; Sa 09:00-14:00; Su off", overnight spans like 22:00-02:00).
 * Anything fancier (holidays, months, sunrise, week numbers, comments) returns null so the
 * app says "hours not clear" instead of guessing.
 */

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Minutes from midnight; end may run past 1440 for overnight spans. */
export type Span = [number, number];
/** Index 0 = Monday ... 6 = Sunday. */
export type Week = Span[][];

const DAY_LIST = /^(?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?|PH|SH)(?:,(?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?|PH|SH))*$/;
const TIME_SPAN = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

function dayIndexes(spec: string): number[] | null {
  const out = new Set<number>();
  let onlyHolidays = true;
  for (const part of spec.split(",")) {
    if (part === "PH" || part === "SH") continue;
    onlyHolidays = false;
    const [a, b] = part.split("-");
    const ia = DAYS.indexOf(a as (typeof DAYS)[number]);
    const ib = b ? DAYS.indexOf(b as (typeof DAYS)[number]) : ia;
    if (ia < 0 || ib < 0) return null;
    for (let i = ia; ; i = (i + 1) % 7) {
      out.add(i);
      if (i === ib) break;
    }
  }
  // A rule only for holidays: we ignore it (we don't know local holidays).
  if (onlyHolidays) return [];
  return [...out];
}

function timeSpan(text: string): Span | null {
  const m = TIME_SPAN.exec(text.trim());
  if (!m) return null;
  const start = Number(m[1]) * 60 + Number(m[2]);
  let end = Number(m[3]) * 60 + Number(m[4]);
  if (start > 1440 || end > 48 * 60 || Number(m[2]) > 59 || Number(m[4]) > 59) return null;
  if (end <= start) end += 1440; // runs past midnight
  return [start, end];
}

export function parseHours(raw: string | null | undefined): Week | null {
  if (!raw) return null;
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text || text.length > 300) return null;
  if (/^24\/7$/.test(text) || text === "Mo-Su 00:00-24:00" || text === "00:00-24:00") {
    return Array.from({ length: 7 }, () => [[0, 1440] as Span]);
  }
  const week: Week = Array.from({ length: 7 }, () => []);
  const known = new Set<number>();
  const rules = text.split(/\s*(?:;|\|\|)\s*/).filter(Boolean);
  for (const ruleText of rules) {
    // Split "Mo-Fr 08:00-17:00, Sa 09:00-12:00" into separate rules on commas that start a new day selector.
    const tokens = ruleText.split(/\s*,\s*/);
    type Rule = { days: string; times: string[] };
    const parsed: Rule[] = [];
    let pendingDays = "";
    for (const token of tokens) {
      if (DAY_LIST.test(token)) {
        pendingDays = pendingDays ? `${pendingDays},${token}` : token;
        continue;
      }
      const m = /^(\S+)\s+(.+)$/.exec(token);
      if (m && DAY_LIST.test(m[1])) {
        const days = pendingDays ? `${pendingDays},${m[1]}` : m[1];
        parsed.push({ days, times: [m[2]] });
        pendingDays = "";
      } else if (/^[\d]/.test(token) || /^(off|closed)$/i.test(token)) {
        if (pendingDays) {
          parsed.push({ days: pendingDays, times: [token] });
          pendingDays = "";
        } else if (parsed.length) {
          parsed[parsed.length - 1].times.push(token);
        } else {
          parsed.push({ days: "Mo-Su", times: [token] });
        }
      } else {
        return null;
      }
    }
    if (pendingDays) return null;
    for (const rule of parsed) {
      const days = dayIndexes(rule.days);
      if (!days) return null;
      const spans: Span[] = [];
      let closed = false;
      for (const t of rule.times) {
        if (/^(off|closed)$/i.test(t.trim())) {
          closed = true;
          continue;
        }
        const span = timeSpan(t);
        if (!span) return null;
        spans.push(span);
      }
      for (const d of days) {
        week[d] = closed ? [] : spans;
        known.add(d);
      }
    }
  }
  if (!known.size) return null;
  // Days never mentioned are closed in OSM's model once any day rule exists.
  return week.map((s) => [...s].sort((a, b) => a[0] - b[0]));
}

function clock(min: number) {
  const m = ((min % 1440) + 1440) % 1440;
  if (m === 0) return "midnight";
  if (m === 720) return "noon";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
}

export type OpenStatus =
  | { state: "open"; allDay: boolean; closesIn: number | null; label: string; today: string }
  | { state: "closed"; opensIn: number | null; label: string; today: string }
  | { state: "unknown"; label: string; today: string };

function mondayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

export function todayText(week: Week, date: Date) {
  const spans = week[mondayIndex(date)];
  if (!spans.length) return "Closed today";
  if (spans.length === 1 && spans[0][0] === 0 && spans[0][1] >= 1440) return "Open 24 hours";
  return spans.map(([a, b]) => `${clock(a)}–${clock(b)}`).join(", ");
}

/** Works out open/closed at `now` using the phone's local time. */
export function statusAt(raw: string | null | undefined, now: Date): OpenStatus {
  const week = parseHours(raw);
  if (!week) {
    return { state: "unknown", label: raw ? "Hours listed but not clear" : "Hours not listed", today: "" };
  }
  const today = mondayIndex(now);
  const minute = now.getHours() * 60 + now.getMinutes();
  const always = week.every((s) => s.length === 1 && s[0][0] === 0 && s[0][1] >= 1440);
  if (always) return { state: "open", allDay: true, closesIn: null, label: "Open 24 hours", today: "Open 24 hours" };

  // Lay spans on a timeline starting at yesterday 00:00 so overnight spans count.
  const timeline: Span[] = [];
  for (let offset = -1; offset <= 7; offset++) {
    const day = (today + offset + 7 * 2) % 7;
    for (const [a, b] of week[day]) timeline.push([a + offset * 1440, b + offset * 1440]);
  }
  timeline.sort((x, y) => x[0] - y[0]);
  // Merge touching spans (e.g. 00:00-24:00 every day, or 08:00-12:00,12:00-17:00).
  const merged: Span[] = [];
  for (const s of timeline) {
    const last = merged[merged.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else merged.push([s[0], s[1]]);
  }
  const text = todayText(week, now);
  const current = merged.find(([a, b]) => a <= minute && minute < b);
  if (current) {
    const closesIn = current[1] - minute;
    if (closesIn > 7 * 1440) return { state: "open", allDay: true, closesIn: null, label: "Open 24 hours", today: text };
    const label = closesIn <= 60 ? `Closes soon · ${clock(current[1])}` : `Open until ${clock(current[1])}`;
    return { state: "open", allDay: false, closesIn, label, today: text };
  }
  const next = merged.find(([a]) => a > minute);
  if (!next) return { state: "closed", opensIn: null, label: "Closed", today: text };
  const opensIn = next[0] - minute;
  const dayOffset = Math.floor(next[0] / 1440);
  const when =
    dayOffset === 0 ? clock(next[0]) : dayOffset === 1 ? `tomorrow ${clock(next[0])}` : `${DAY_NAMES[(today + dayOffset) % 7]} ${clock(next[0])}`;
  return { state: "closed", opensIn, label: opensIn <= 60 ? `Opens soon · ${clock(next[0])}` : `Closed · opens ${when}`, today: text };
}
