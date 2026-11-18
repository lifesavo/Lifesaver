export const fuelGrades = ["regular", "midgrade", "premium", "diesel"] as const;
export type FuelGrade = (typeof fuelGrades)[number];

export type PriceKind = "live" | "reported" | "estimated";

export type FuelPrice = {
  amount: number;
  updatedAt: string | null;
  kind: PriceKind;
};

export type FuelStation = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  distanceMeters: number;
  prices: Partial<Record<FuelGrade, FuelPrice>>;
};

export type FuelSource = "google" | "openstreetmap";

export type FuelLookup = {
  source: FuelSource;
  /** True only when at least one price came from a live fuel-price feed. */
  pricesAreLive: boolean;
  fetchedAt: string;
  cached: boolean;
  center: { lat: number; lng: number };
  radiusMeters: number;
  stations: FuelStation[];
  notice: string;
};

export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function miles(meters: number) {
  return meters / 1609.344;
}

export function formatMiles(meters: number) {
  const value = miles(meters);
  return value < 10 ? `${value.toFixed(1)} mi` : `${Math.round(value)} mi`;
}
