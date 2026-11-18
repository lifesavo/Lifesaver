"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  availableGrades,
  GradeToggle,
  StationRows,
} from "@/components/fuel-list";
import type { FuelGrade, FuelLookup } from "@/lib/fuel/types";

type Area = { lat: number; lng: number; via: "location" | "zip" };

export function FuelCard({ zip }: { zip: string }) {
  const [area, setArea] = useState<Area | null>(null);
  const [lookup, setLookup] = useState<FuelLookup | null>(null);
  const [grade, setGrade] = useState<FuelGrade>("regular");
  const [status, setStatus] = useState("Finding stations near you…");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    async function loadFromZip(reason: string) {
      setStatus(`Using ZIP ${zip}. ${reason}`);
      try {
        const response = await fetch(`/api/fuel?zip=${zip}&radius=4828`);
        const data = (await response.json()) as FuelLookup & { ok?: boolean; message?: string };
        if (!response.ok || data.ok === false) throw new Error(data.message || "Fuel lookup failed.");
        if (cancel) return;
        setArea({ lat: data.center.lat, lng: data.center.lng, via: "zip" });
        setLookup(data);
        setError("");
      } catch (cause) {
        if (!cancel) setError(cause instanceof Error ? cause.message : "Fuel lookup failed.");
      }
    }

    if (!navigator.geolocation) {
      void loadFromZip("This browser has no location.");
      return () => {
        cancel = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancel) return;
        setArea({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          via: "location",
        });
        setStatus("Using your location.");
      },
      () => {
        void loadFromZip("Location was blocked, so this uses your ZIP.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );

    return () => {
      cancel = true;
    };
  }, [zip]);

  useEffect(() => {
    if (!area || area.via !== "location") return;
    let cancel = false;
    void (async () => {
      try {
        const response = await fetch(`/api/fuel?lat=${area.lat}&lng=${area.lng}&radius=4828`);
        const data = (await response.json()) as FuelLookup & { ok?: boolean; message?: string };
        if (!response.ok || data.ok === false) throw new Error(data.message || "Fuel lookup failed.");
        if (!cancel) {
          setLookup(data);
          setError("");
        }
      } catch (cause) {
        if (!cancel) setError(cause instanceof Error ? cause.message : "Fuel lookup failed.");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [area]);

  const grades = lookup ? availableGrades(lookup) : [];

  return (
    <section aria-labelledby="fuel-heading" className="rounded-3xl bg-lime p-4 text-ink">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide uppercase">Open the app</p>
          <h1 id="fuel-heading" className="font-serif text-3xl leading-none tracking-tight">
            Cheapest gas near you
          </h1>
        </div>
        <Link href="/fuel" className="shrink-0 rounded-full bg-ink px-3 py-2 text-sm font-bold text-white">
          See more
        </Link>
      </div>
      <p className="mt-2 text-sm" role="status">
        {error || (lookup ? lookup.notice : status)}
      </p>
      {lookup && (
        <>
          <div className="mt-3">
            <GradeToggle grade={grade} onChange={setGrade} available={grades} />
          </div>
          <div className="mt-3">
            <StationRows lookup={lookup} grade={grade} limit={3} />
          </div>
        </>
      )}
    </section>
  );
}
