"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LocateFixed } from "lucide-react";
import { conditionFor, type Outfit, type WeatherReport } from "@/lib/weather/outfit";
import { AlertsBanner } from "@/components/alerts";

type State = { report: WeatherReport; outfit: Outfit; via: "location" | "place" } | null;

export function useWeather(fallback: string) {
  const [data, setData] = useState<State>(null);
  const [status, setStatus] = useState("Checking the sky near you…");
  const [error, setError] = useState("");

  const load = useCallback(async (query: string, via: "location" | "place") => {
    setError("");
    try {
      const response = await fetch(`/api/weather?${query}`);
      const body = (await response.json()) as { ok?: boolean; message?: string; report?: WeatherReport; outfit?: Outfit };
      if (!response.ok || !body.ok || !body.report || !body.outfit) throw new Error(body.message || "Weather lookup failed.");
      setData({ report: body.report, outfit: body.outfit, via });
      setStatus(via === "location" ? "Using your location." : `Using ${body.report.place}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Weather lookup failed.");
    }
  }, []);

  const byPlace = useCallback((place: string) => load(`q=${encodeURIComponent(place)}`, "place"), [load]);

  const locate = useCallback(() => {
    const fallbackLoad = (reason: string) => {
      if (fallback) {
        setStatus(`${reason} Using ${fallback}.`);
        void byPlace(fallback);
      } else {
        setStatus(reason);
        setError("Enter a ZIP or city.");
      }
    };
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      fallbackLoad("No location in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => void load(`lat=${position.coords.latitude.toFixed(4)}&lng=${position.coords.longitude.toFixed(4)}`, "location"),
      () => fallbackLoad("Location is off."),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  }, [fallback, load, byPlace]);

  useEffect(() => {
    queueMicrotask(locate);
  }, [locate]);

  return { data, status, error, locate, byPlace };
}

export function WeatherCard({ zip }: { zip: string }) {
  const { data, status, error } = useWeather(zip);
  const condition = data ? conditionFor(data.report.today.code) : null;
  return (
    <Link href="/weather" className="block overflow-hidden rounded-3xl bg-gradient-to-br from-[#38bdf8] via-[#6366f1] to-[#e01470] px-4 py-4 text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-lime uppercase">What to wear · replaces your weather app</p>
          {data ? (
            <p className="mt-1 font-serif text-2xl leading-tight">{data.outfit.summary}</p>
          ) : (
            <p className="mt-1 font-serif text-2xl leading-tight">{error ? "Tap to set your city" : "Checking the weather…"}</p>
          )}
        </div>
        {data && (
          <p className="shrink-0 text-right">
            <span className="block text-3xl leading-none">{condition?.emoji}</span>
            <span className="block font-serif text-3xl leading-none">{Math.round(data.report.current.temp)}°</span>
          </p>
        )}
      </div>
      {data && (
        <p className="mt-2 flex flex-wrap gap-1.5">
          {data.outfit.picks.map((pick) => (
            <span key={pick.label} className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
              {pick.emoji} {pick.label}
            </span>
          ))}
        </p>
      )}
      <p className="mt-2 text-[11px] text-white/80">{data ? `${data.report.place} · H ${Math.round(data.report.today.high)}° L ${Math.round(data.report.today.low)}° · ${data.report.today.precipChance}% rain` : status}</p>
    </Link>
  );
}

export function WeatherScreen({ zip }: { zip: string }) {
  const { data, status, error, locate, byPlace } = useWeather(zip);
  const [place, setPlace] = useState("");
  const condition = data ? conditionFor(data.report.today.code) : null;
  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold tracking-wide text-primary uppercase">Replaces your weather app</p>
        <h1 className="font-serif text-3xl tracking-tight">What to wear</h1>
        <p className="mt-1 text-sm text-muted-foreground">Today&apos;s weather turned into an outfit. Works anywhere in the US.</p>
      </header>

      <AlertsBanner zip={zip} />

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (place.trim().length >= 2) void byPlace(place.trim());
        }}
      >
        <label htmlFor="wx-place" className="sr-only">ZIP or city</label>
        <input id="wx-place" value={place} onChange={(event) => setPlace(event.target.value)} placeholder="ZIP or city, ST" className="h-12 min-w-0 flex-1 rounded-full border px-4 text-base" />
        <button type="submit" className="h-12 rounded-full bg-ink px-4 text-sm font-bold text-white">Check</button>
        <button type="button" onClick={locate} aria-label="Use my location" className="h-12 rounded-full bg-lime px-3 text-ink">
          <LocateFixed className="size-5" aria-hidden="true" />
        </button>
      </form>

      {error && <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}

      {data ? (
        <>
          <section className="rounded-3xl bg-gradient-to-br from-[#38bdf8] via-[#6366f1] to-[#e01470] px-5 py-6 text-white">
            <p className="text-sm text-white/85">{data.report.place}</p>
            <div className="mt-1 flex items-end gap-3">
              <span className="text-5xl leading-none">{condition?.emoji}</span>
              <span className="font-serif text-6xl leading-none">{Math.round(data.report.current.temp)}°F</span>
            </div>
            <p className="mt-2 text-sm">
              Feels like {Math.round(data.report.current.feelsLike)}° · High {Math.round(data.report.today.high)}° · Low {Math.round(data.report.today.low)}°
            </p>
            <p className="text-sm">
              {data.report.today.precipChance}% chance of rain · Wind up to {Math.round(data.report.today.windMax)} mph
              {data.report.today.snowInches >= 0.1 ? ` · ${data.report.today.snowInches.toFixed(1)} in snow` : ""}
            </p>
            <p className="mt-4 rounded-2xl bg-white/15 px-3 py-3 font-serif text-2xl leading-tight">{data.outfit.summary}</p>
          </section>

          <ul className="grid grid-cols-2 gap-2">
            {data.outfit.picks.map((pick) => (
              <li key={pick.label} className="rounded-3xl border-2 border-ink/10 bg-card p-3">
                <p className="text-3xl">{pick.emoji}</p>
                <p className="mt-1 font-semibold">{pick.label}</p>
                <p className="text-xs text-muted-foreground">{pick.why}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            {status} Forecast from {data.report.source}, updated about every 10 minutes. Check local alerts at{" "}
            <a className="underline" href={`https://forecast.weather.gov/MapClick.php?lat=${data.report.lat}&lon=${data.report.lng}`} target="_blank" rel="noreferrer">weather.gov</a>.
          </p>
        </>
      ) : (
        !error && <p className="text-sm text-muted-foreground" role="status">{status}</p>
      )}
    </div>
  );
}
