"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Globe, LocateFixed, Navigation, Phone, RefreshCw, Search, Star } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { statusAt, type OpenStatus } from "@/lib/open-now/hours";
import { OPEN_CATEGORIES, type NearbyPlace, type OpenCategoryId } from "@/lib/open-now/places";
import { useProfile } from "@/lib/profile";

const STORE_KEY = "lifesaver.open.v1";
const MILE = 1609.34;
const RADII = [2, 5, 10, 25] as const;

type SavedSpot = Pick<NearbyPlace, "id" | "name" | "lat" | "lng" | "hours" | "phone" | "website" | "address" | "kind">;

type Saved = {
  cat: OpenCategoryId;
  miles: number;
  zip: string;
  useGps: boolean;
  openOnly: boolean;
  spots: SavedSpot[];
};

type Lookup = { source: "overpass" | "nominatim"; places: NearbyPlace[]; fetchedAt: string };

const CATEGORY_IDS = Object.keys(OPEN_CATEGORIES) as OpenCategoryId[];

function miles(meters: number) {
  const m = meters / MILE;
  return m < 0.1 ? "nearby" : `${m < 10 ? m.toFixed(1) : Math.round(m)} mi`;
}

function directions(p: { lat: number; lng: number }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
}

function checkHours(p: { name: string; lat: number; lng: number }) {
  return `https://www.google.com/maps/search/${encodeURIComponent(p.name)}/@${p.lat.toFixed(5)},${p.lng.toFixed(5)},16z`;
}

function tone(status: OpenStatus) {
  if (status.state === "open") {
    return status.closesIn != null && status.closesIn <= 60 ? "bg-sun text-ink" : "bg-lime text-ink";
  }
  if (status.state === "closed") return status.opensIn != null && status.opensIn <= 60 ? "bg-cyan text-ink" : "bg-pop text-white";
  return "bg-muted text-muted-foreground";
}

function PlaceCard({
  place,
  status,
  starred,
  onStar,
  showDistance = true,
}: {
  place: SavedSpot & { distanceMeters?: number };
  status: OpenStatus;
  starred: boolean;
  onStar: () => void;
  showDistance?: boolean;
}) {
  return (
    <li className="rounded-3xl border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold break-words">{place.name}</p>
          <p className="text-sm text-muted-foreground capitalize">
            {place.kind}
            {showDistance && place.distanceMeters != null ? ` · ${miles(place.distanceMeters)}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onStar}
          aria-pressed={starred}
          aria-label={starred ? `Remove ${place.name} from my spots` : `Save ${place.name} to my spots`}
          className="p-1"
        >
          <Star className={cn("size-5", starred ? "fill-gold text-gold" : "text-muted-foreground")} aria-hidden="true" />
        </button>
      </div>
      <p className={cn("mt-2 inline-block rounded-full px-3 py-1 text-sm font-bold", tone(status))}>{status.label}</p>
      {status.today ? <p className="mt-1 text-xs text-muted-foreground">Today: {status.today}</p> : null}
      {status.state === "unknown" && place.hours ? (
        <p className="mt-1 text-xs break-words text-muted-foreground">Listed as: {place.hours}</p>
      ) : null}
      {place.address ? <p className="mt-1 text-xs break-words text-muted-foreground">{place.address}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={directions(place)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground"
        >
          <Navigation className="size-4" aria-hidden="true" /> Directions
        </a>
        {place.phone ? (
          <a href={`tel:${place.phone.replace(/[^\d+]/g, "")}`} className="inline-flex h-9 items-center gap-1 rounded-full bg-secondary px-3 text-sm font-semibold">
            <Phone className="size-4" aria-hidden="true" /> Call
          </a>
        ) : null}
        {place.website ? (
          <a
            href={place.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1 rounded-full bg-secondary px-3 text-sm font-semibold"
          >
            <Globe className="size-4" aria-hidden="true" /> Website
          </a>
        ) : null}
        {status.state === "unknown" ? (
          <a
            href={checkHours(place)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1 rounded-full bg-secondary px-3 text-sm font-semibold"
          >
            <Search className="size-4" aria-hidden="true" /> Check hours
          </a>
        ) : null}
      </div>
    </li>
  );
}

export function OpenScreen() {
  const { profile } = useProfile();
  const [loaded, setLoaded] = useState(false);
  const [cat, setCat] = useState<OpenCategoryId>("grocery");
  const [radius, setRadius] = useState<number>(5);
  const [zip, setZip] = useState("");
  const [useGps, setUseGps] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [spots, setSpots] = useState<SavedSpot[]>([]);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Lookup | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<Saved>;
        if (s.cat && s.cat in OPEN_CATEGORIES) setCat(s.cat);
        if (typeof s.miles === "number" && (RADII as readonly number[]).includes(s.miles)) setRadius(s.miles);
        if (typeof s.zip === "string") setZip(s.zip);
        if (typeof s.useGps === "boolean") setUseGps(s.useGps);
        if (typeof s.openOnly === "boolean") setOpenOnly(s.openOnly);
        if (Array.isArray(s.spots)) setSpots(s.spots.filter((x) => x && typeof x.name === "string" && typeof x.lat === "number"));
      }
    } catch {
      // Ignore unreadable saved data and start fresh.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded && !zip && profile?.zip && /^\d{5}$/.test(profile.zip)) setZip(profile.zip);
  }, [loaded, zip, profile?.zip]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ cat, miles: radius, zip, useGps, openOnly, spots } satisfies Saved));
    } catch {
      // Storage full or blocked; keep working in memory.
    }
  }, [cat, radius, zip, useGps, openOnly, spots, loaded]);

  // Re-check open/closed every minute while the page is open.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const search = useCallback(
    async (where: { lat: number; lng: number } | { zip: string }, category: OpenCategoryId, mi: number) => {
      setBusy(true);
      setError("");
      const params = new URLSearchParams({ cat: category, radius: String(Math.round(mi * MILE)) });
      if ("zip" in where) params.set("zip", where.zip);
      else {
        params.set("lat", where.lat.toFixed(5));
        params.set("lng", where.lng.toFixed(5));
      }
      try {
        const response = await fetch(`/api/open?${params}`);
        const body = (await response.json()) as { ok: boolean; message?: string } & Partial<Lookup>;
        if (!body.ok || !Array.isArray(body.places)) throw new Error(body.message || "Could not load places.");
        setResult({ source: body.source ?? "overpass", places: body.places, fetchedAt: body.fetchedAt ?? new Date().toISOString() });
        setNow(new Date());
      } catch (e) {
        setResult(null);
        setError(e instanceof Error ? e.message : "Could not load places. Try again in a minute.");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("This browser can't share location. Type a ZIP code instead.");
      return;
    }
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPoint(here);
        setUseGps(true);
        setStatus("Using your location.");
        void search(here, cat, radius);
      },
      () => {
        setUseGps(false);
        setStatus("Location is blocked or unavailable. Type a ZIP code instead.");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 },
    );
  }, [cat, radius, search]);

  // If they used location last time, look again when the page opens.
  const [autoTried, setAutoTried] = useState(false);
  useEffect(() => {
    if (!loaded || autoTried) return;
    setAutoTried(true);
    if (useGps) queueMicrotask(locate);
  }, [loaded, autoTried, useGps, locate]);

  function rerun(nextCat: OpenCategoryId, nextMiles: number) {
    if (point) void search(point, nextCat, nextMiles);
    else if (/^\d{5}$/.test(zip) && result) void search({ zip }, nextCat, nextMiles);
  }

  function pickCat(next: OpenCategoryId) {
    setCat(next);
    rerun(next, radius);
  }

  function pickRadius(next: number) {
    setRadius(next);
    rerun(cat, next);
  }

  function searchZip(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{5}$/.test(zip)) {
      setError("Type a 5-digit ZIP code.");
      return;
    }
    setPoint(null);
    setUseGps(false);
    setStatus(`Using ZIP ${zip}.`);
    void search({ zip }, cat, radius);
  }

  function toggleSpot(place: SavedSpot) {
    setSpots((list) =>
      list.some((s) => s.id === place.id)
        ? list.filter((s) => s.id !== place.id)
        : [
            {
              id: place.id,
              name: place.name,
              lat: place.lat,
              lng: place.lng,
              hours: place.hours,
              phone: place.phone,
              website: place.website,
              address: place.address,
              kind: place.kind,
            },
            ...list,
          ].slice(0, 30),
    );
  }

  const groups = useMemo(() => {
    const rows = (result?.places ?? []).map((place) => ({ place, status: statusAt(place.hours, now) }));
    return {
      open: rows.filter((r) => r.status.state === "open"),
      closed: rows.filter((r) => r.status.state === "closed"),
      unknown: rows.filter((r) => r.status.state === "unknown"),
      total: rows.length,
    };
  }, [result, now]);

  const starredIds = new Set(spots.map((s) => s.id));
  const label = OPEN_CATEGORIES[cat].label.toLowerCase();
  const timeText = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold tracking-wide text-primary uppercase">New · Free</p>
        <h1 className="font-serif text-3xl tracking-tight">Open near me</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What&apos;s open right now around you, closest first, with today&apos;s hours, a call button, and directions.
        </p>
      </header>

      <section className="space-y-3 rounded-3xl bg-mint px-4 py-4 text-ink">
        <Button type="button" onClick={locate} disabled={!loaded || busy} className="h-12 w-full rounded-full text-base">
          <LocateFixed className="size-5" aria-hidden="true" /> {busy ? "Looking…" : "Use my location"}
        </Button>
        <form onSubmit={searchZip} className="flex items-center gap-2">
          <Input
            inputMode="numeric"
            placeholder="or ZIP code"
            aria-label="ZIP code"
            value={zip}
            maxLength={5}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            className="h-11 flex-1 rounded-2xl bg-background/80 text-base"
          />
          <Button type="submit" variant="secondary" className="h-11 rounded-full px-4" disabled={!loaded || busy || zip.length !== 5}>
            Search
          </Button>
        </form>
        {status ? <p className="text-xs" role="status">{status}</p> : null}
      </section>

      <div role="radiogroup" aria-label="Kind of place" className="flex flex-wrap gap-2">
        {CATEGORY_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={cat === id}
            onClick={() => pickCat(id)}
            className={cn("h-9 rounded-full px-3 text-sm font-semibold", cat === id ? "bg-primary text-primary-foreground" : "bg-secondary")}
          >
            <span aria-hidden="true">{OPEN_CATEGORIES[id].emoji}</span> {OPEN_CATEGORIES[id].label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Within</span>
        {RADII.map((mi) => (
          <button
            key={mi}
            type="button"
            aria-pressed={radius === mi}
            onClick={() => pickRadius(mi)}
            className={cn("h-8 rounded-full px-3 text-sm font-semibold", radius === mi ? "bg-ink text-white" : "bg-secondary")}
          >
            {mi} mi
          </button>
        ))}
        <button
          type="button"
          aria-pressed={openOnly}
          onClick={() => setOpenOnly((v) => !v)}
          className={cn("ml-auto h-8 rounded-full px-3 text-sm font-semibold", openOnly ? "bg-lime text-ink" : "bg-secondary")}
        >
          {openOnly ? "✓ Open now only" : "Open now only"}
        </button>
      </div>

      {spots.length ? (
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-bold tracking-wide text-primary uppercase">My spots · {spots.length}</h2>
          <ul className="space-y-2">
            {spots.map((spot) => (
              <PlaceCard key={spot.id} place={spot} status={statusAt(spot.hours, now)} starred onStar={() => toggleSpot(spot)} showDistance={false} />
            ))}
          </ul>
        </section>
      ) : null}

      {error ? <p className="rounded-2xl bg-pop/10 px-3 py-2 text-sm font-semibold text-pop">{error}</p> : null}

      {busy ? <p className="px-1 text-sm text-muted-foreground">Looking up {label} nearby…</p> : null}

      {result && !busy ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-3xl bg-lime px-4 py-3 text-ink">
            <div>
              <p className="font-serif text-2xl leading-tight">
                {groups.open.length} open now
              </p>
              <p className="text-sm">
                {groups.total} {label} within {radius} mi · as of {timeText}
              </p>
            </div>
            <button
              type="button"
              aria-label="Refresh"
              onClick={() => rerun(cat, radius)}
              className="rounded-full bg-background/70 p-2"
            >
              <RefreshCw className="size-5" aria-hidden="true" />
            </button>
          </div>

          {groups.total === 0 ? (
            <p className="rounded-2xl bg-muted px-3 py-3 text-sm">
              No {label} found on the map within {radius} miles. Try a bigger distance or another kind of place.
            </p>
          ) : null}

          {groups.open.length ? (
            <div className="space-y-2">
              <h2 className="px-1 text-xs font-bold tracking-wide text-primary uppercase">Open now · {groups.open.length}</h2>
              <ul className="space-y-2">
                {groups.open.map(({ place, status: s }) => (
                  <PlaceCard key={place.id} place={place} status={s} starred={starredIds.has(place.id)} onStar={() => toggleSpot(place)} />
                ))}
              </ul>
            </div>
          ) : groups.total ? (
            <p className="rounded-2xl bg-muted px-3 py-3 text-sm">
              Nothing in this list has posted hours that say it&apos;s open right now.
              {groups.unknown.length ? " Some places below don't list hours, so call or check before you drive." : ""}
            </p>
          ) : null}

          {!openOnly && groups.closed.length ? (
            <div className="space-y-2">
              <h2 className="px-1 text-xs font-bold tracking-wide text-primary uppercase">Closed now · {groups.closed.length}</h2>
              <ul className="space-y-2">
                {groups.closed.map(({ place, status: s }) => (
                  <PlaceCard key={place.id} place={place} status={s} starred={starredIds.has(place.id)} onStar={() => toggleSpot(place)} />
                ))}
              </ul>
            </div>
          ) : null}

          {!openOnly && groups.unknown.length ? (
            <div className="space-y-2">
              <h2 className="px-1 text-xs font-bold tracking-wide text-primary uppercase">Hours not listed · {groups.unknown.length}</h2>
              <ul className="space-y-2">
                {groups.unknown.map(({ place, status: s }) => (
                  <PlaceCard key={place.id} place={place} status={s} starred={starredIds.has(place.id)} onStar={() => toggleSpot(place)} />
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {!result && !busy && !error ? (
        <p className="rounded-2xl bg-muted px-3 py-3 text-sm">
          Pick a kind of place, then tap <strong>Use my location</strong> or type a ZIP. Star the places you use most and they&apos;ll stay at the
          top with their open/closed status.
        </p>
      ) : null}

      <p className="rounded-2xl bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
        Places and hours come from OpenStreetMap, a free map anyone can edit (© OpenStreetMap contributors). Open/closed is worked out from the
        posted hours and your phone&apos;s clock. Hours can be out of date and holidays aren&apos;t counted, so call ahead for anything important.
        In an emergency, call 911. Your settings and starred spots are saved only on this phone, in this browser.
      </p>
    </div>
  );
}
