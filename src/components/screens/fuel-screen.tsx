"use client";

import { useEffect, useMemo, useState } from "react";
import { availableGrades, GradeToggle, StationRows } from "@/components/fuel-list";
import { PlanChip } from "@/components/plan-chip";
import type { FuelGrade, FuelLookup } from "@/lib/fuel/types";
import { useProfile } from "@/lib/profile";

const radii = [
  { miles: 1, meters: 1609 },
  { miles: 3, meters: 4828 },
  { miles: 5, meters: 8047 },
  { miles: 10, meters: 16093 },
];

export function FuelScreen() {
  const { profile } = useProfile();
  const [radius, setRadius] = useState(radii[1]);
  const [lookup, setLookup] = useState<FuelLookup | null>(null);
  const [grade, setGrade] = useState<FuelGrade>("regular");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let cancel = false;
    const params = new URLSearchParams(window.location.search);
    const lat = params.get("lat");
    const lng = params.get("lng");
    const query = lat && lng
      ? `lat=${lat}&lng=${lng}&radius=${radius.meters}`
      : `zip=${profile.zip}&radius=${radius.meters}`;
    void (async () => {
      await Promise.resolve();
      if (cancel) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/fuel?${query}`);
        const data = (await response.json()) as FuelLookup & { ok?: boolean; message?: string };
        if (!response.ok || data.ok === false) throw new Error(data.message || "Fuel lookup failed.");
        if (!cancel) {
          setLookup(data);
          setError("");
        }
      } catch (cause) {
        if (!cancel) setError(cause instanceof Error ? cause.message : "Fuel lookup failed.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [profile, radius]);

  const grades = lookup ? availableGrades(lookup) : [];
  const mapSrc = useMemo(() => {
    if (!lookup) return "";
    const pad = radius.meters / 111320;
    const south = lookup.center.lat - pad;
    const north = lookup.center.lat + pad;
    const west = lookup.center.lng - pad;
    const east = lookup.center.lng + pad;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${west}%2C${south}%2C${east}%2C${north}&layer=mapnik&marker=${lookup.center.lat}%2C${lookup.center.lng}`;
  }, [lookup, radius.meters]);

  if (!profile) return null;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Fuel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Stations near you, cheapest first.</p>
        </div>
        <PlanChip />
      </header>
      <div role="radiogroup" aria-label="Search radius" className="flex gap-2">
        {radii.map((item) => (
          <button
            key={item.miles}
            type="button"
            role="radio"
            aria-checked={radius.miles === item.miles}
            onClick={() => setRadius(item)}
            className={`h-10 rounded-full px-3 text-sm font-bold ${
              radius.miles === item.miles ? "bg-ink text-white" : "bg-muted text-ink"
            }`}
          >
            {item.miles} mi
          </button>
        ))}
      </div>
      {loading && <p role="status">Updating the list…</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {lookup && (
        <>
          <p className="text-sm text-muted-foreground">{lookup.notice}</p>
          <iframe title="Map of this search area" className="h-56 w-full rounded-3xl border border-ink/10" src={mapSrc} />
          <p className="text-xs text-muted-foreground">
            Map tiles and station places © OpenStreetMap contributors. The pin is your search center.
          </p>
          <GradeToggle grade={grade} onChange={setGrade} available={grades} />
          <StationRows lookup={lookup} grade={grade} />
        </>
      )}
    </div>
  );
}
