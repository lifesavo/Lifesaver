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
};

export const KNOWN_SOURCES = ["tiktok", "instagram", "x", "reddit", "facebook"] as const;

export type Attribution = {
  ref: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
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
