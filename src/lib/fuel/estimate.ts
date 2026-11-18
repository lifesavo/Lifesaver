import type { FuelGrade, FuelPrice } from "@/lib/fuel/types";

const offsets: Record<FuelGrade, number> = {
  regular: 0,
  midgrade: 0.3,
  premium: 0.62,
  diesel: 0.38,
};

/** Stable demo estimate. Callers must label this as estimated, never as a live price. */
export function estimatedPrice(stationId: string, grade: FuelGrade): FuelPrice {
  let hash = 0;
  for (const char of stationId) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  const regular = 3.59 + (hash % 130) / 100;
  const amount = Math.round((regular + offsets[grade]) * 100) / 100;
  return { amount, updatedAt: null, kind: "estimated" };
}

export function withEstimates(
  stationId: string,
  prices: Partial<Record<FuelGrade, FuelPrice>>,
): Partial<Record<FuelGrade, FuelPrice>> {
  const next = { ...prices };
  for (const grade of ["regular", "midgrade", "premium", "diesel"] as const) {
    if (!next[grade]) next[grade] = estimatedPrice(stationId, grade);
  }
  return next;
}
