"use client";

import { formatMiles, type FuelGrade, type FuelLookup, type FuelStation } from "@/lib/fuel/types";
import { money } from "@/lib/money";

const gradeLabel: Record<FuelGrade, string> = {
  regular: "Regular",
  midgrade: "Mid",
  premium: "Premium",
  diesel: "Diesel",
};

export function directionsUrl(station: FuelStation, which: "google" | "apple") {
  const destination = `${station.lat},${station.lng}`;
  if (which === "apple") {
    return `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}

export function preferredMaps() {
  if (typeof navigator === "undefined") return "google" as const;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "apple" as const : "google" as const;
}

function whenUpdated(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function StationRows({
  lookup,
  grade,
  limit,
}: {
  lookup: FuelLookup;
  grade: FuelGrade;
  limit?: number;
}) {
  const priced = lookup.stations.filter((station) => station.prices[grade]);
  const missing = lookup.stations.filter((station) => !station.prices[grade]);
  const rows = [...priced.sort((a, b) => (a.prices[grade]?.amount ?? 0) - (b.prices[grade]?.amount ?? 0)), ...missing];
  const visible = limit ? rows.slice(0, limit) : rows;
  const maps = preferredMaps();

  if (visible.length === 0) {
    return (
      <p className="rounded-2xl bg-muted px-3 py-3 text-sm" role="status">
        No gas stations in this radius.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {visible.map((station, index) => {
        const price = station.prices[grade];
        const updated = price ? whenUpdated(price.updatedAt) : null;
        return (
          <li key={station.id} className="rounded-2xl bg-white/95 px-3 py-3 text-ink">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {index === 0 && price ? "Cheapest · " : ""}
                  {station.name}
                </p>
                <p className="text-xs text-muted-foreground">{formatMiles(station.distanceMeters)}</p>
              </div>
              <p className="text-right font-serif text-2xl leading-none">
                {price ? (
                  <>
                    {price.kind === "estimated" ? <span className="mr-1 text-xs font-sans font-bold uppercase">Est.</span> : null}
                    {money(price.amount)}
                  </>
                ) : (
                  <span className="font-sans text-sm font-semibold">No price listed</span>
                )}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {price?.kind === "live" && (updated ? `Live price, updated ${updated}` : "Live price")}
              {price?.kind === "reported" && "Price reported on OpenStreetMap, not a live feed"}
              {price?.kind === "estimated" && "Estimated, not a live pump price"}
              {!price && "This source did not list a price. Nothing was invented."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={directionsUrl(station, maps)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center rounded-full bg-ink px-3 text-sm font-bold text-white"
              >
                Directions
              </a>
              <a
                href={directionsUrl(station, maps === "apple" ? "google" : "apple")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center rounded-full border border-ink/20 px-3 text-sm font-semibold"
              >
                {maps === "apple" ? "Google Maps" : "Apple Maps"}
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function GradeToggle({
  grade,
  onChange,
  available,
}: {
  grade: FuelGrade;
  onChange: (grade: FuelGrade) => void;
  available: FuelGrade[];
}) {
  const grades = available.length > 0 ? available : (["regular"] as FuelGrade[]);
  return (
    <div role="radiogroup" aria-label="Fuel grade" className="flex gap-2 overflow-x-auto">
      {grades.map((item) => (
        <button
          key={item}
          type="button"
          role="radio"
          aria-checked={grade === item}
          onClick={() => onChange(item)}
          className={`h-10 shrink-0 rounded-full px-3 text-sm font-bold ${
            grade === item ? "bg-ink text-white" : "bg-white/80 text-ink"
          }`}
        >
          {gradeLabel[item]}
        </button>
      ))}
    </div>
  );
}

export function availableGrades(lookup: FuelLookup): FuelGrade[] {
  return (["regular", "midgrade", "premium", "diesel"] as const).filter((grade) =>
    lookup.stations.some((station) => station.prices[grade]),
  );
}
