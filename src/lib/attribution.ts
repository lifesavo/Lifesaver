const SOURCE_ALIASES: Record<string, string> = {
  tiktok: "tiktok",
  tt: "tiktok",
  instagram: "instagram",
  ig: "instagram",
  insta: "instagram",
  x: "x",
  twitter: "x",
  reddit: "reddit",
  facebook: "facebook",
  fb: "facebook",
  meta: "meta",
  youtube: "youtube",
  yt: "youtube",
};

export const KNOWN_SOURCES = ["tiktok", "instagram", "x", "reddit", "facebook", "meta", "youtube"] as const;

export type Attribution = {
  ref: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  /** Set to "trial" when the sign-up came from the Try it free flow. */
  source?: string | null;
};

function clean(value: unknown, max = 64) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(trimmed)) return null;
  return trimmed;
}

export function normalizeSource(value: unknown) {
  const token = clean(value);
  if (!token) return null;
  const key = token.toLowerCase();
  return SOURCE_ALIASES[key] ?? key;
}

export function readAttribution(input: {
  ref?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
}): Attribution {
  return {
    ref: clean(input.ref),
    utmSource: normalizeSource(input.utm_source),
    utmMedium: clean(input.utm_medium)?.toLowerCase() ?? null,
    utmCampaign: clean(input.utm_campaign),
  };
}

/** Traffic source for first-party counters: utm_source, else ref, else "direct". */
export function trafficSource(input: { utm_source?: unknown; utmSource?: unknown; ref?: unknown }) {
  const utm = normalizeSource(input.utm_source ?? input.utmSource);
  if (utm) return utm;
  return clean(input.ref) ?? "direct";
}

/** /start?trial=1 plus any utm_source / ref already on the current page. */
export function trialStartPath(search: string | URLSearchParams | null | undefined) {
  const src =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search
        ? new URLSearchParams(search)
        : new URLSearchParams();
  const out = new URLSearchParams();
  out.set("trial", "1");
  const utm = normalizeSource(src.get("utm_source"));
  const medium = clean(src.get("utm_medium"))?.toLowerCase() ?? null;
  const campaign = clean(src.get("utm_campaign"));
  const ref = clean(src.get("ref"));
  if (utm) out.set("utm_source", utm);
  if (medium) out.set("utm_medium", medium);
  if (campaign) out.set("utm_campaign", campaign);
  if (ref) out.set("ref", ref);
  return `/start?${out.toString()}`;
}
