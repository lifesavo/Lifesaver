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
  const pins = useMemo(() => {
    if (!lookup) return null;
    const points = lookup.stations.slice(0, 8);
    const lats = [lookup.center.lat, ...points.map((station) => station.lat)];
    const lngs = [lookup.center.lng, ...points.map((station) => station.lng)];
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const xFor = (lng: number) => ((lng - minLng) / Math.max(0.0001, maxLng - minLng)) * 84 + 8;
    const yFor = (lat: number) => ((maxLat - lat) / Math.max(0.0001, maxLat - minLat)) * 76 + 12;
    return {
      you: { x: xFor(lookup.center.lng), y: yFor(lookup.center.lat) },
      stations: points.map((station) => ({
        id: station.id,
        name: station.name,
        x: xFor(station.lng),
        y: yFor(station.lat),
      })),
    };
  }, [lookup]);

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
          {pins && (
            <div className="relative h-56 overflow-hidden rounded-3xl border border-ink/10 bg-[#d7ead8]" role="img" aria-label="Map of nearby gas stations">
              <span className="absolute rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white" style={{ left: `${pins.you.x}%`, top: `${pins.you.y}%`, transform: "translate(-50%, -50%)" }}>
                You
              </span>
              {pins.stations.map((station) => (
                <span key={station.id} className="absolute max-w-24 truncate rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white" style={{ left: `${station.x}%`, top: `${station.y}%`, transform: "translate(-50%, -50%)" }}>
                  {station.name}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Station places are from OpenStreetMap. Pins show your search center and the nearest names.
          </p>
          <GradeToggle grade={grade} onChange={setGrade} available={grades} />
          <StationRows lookup={lookup} grade={grade} />
        </>
      )}
    </div>
  );
}
