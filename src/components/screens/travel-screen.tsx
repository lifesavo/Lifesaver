"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlanChip } from "@/components/plan-chip";
import { money } from "@/lib/money";
import { FOUNDING_HAND_LABEL, HAND_PRICE_LABEL } from "@/lib/pricing";
import type { TravelOption, TravelSearch, TripQuery } from "@/lib/travel/types";
import { useProfile } from "@/lib/profile";

const SAVED_KEY = "lifesaver.trips.v1";

type SavedTrip = TripQuery & {
  id: string;
  savedFlight: number | null;
  savedKind: "live" | "sample" | null;
  alert: string | null;
};

const emptyQuery: TripQuery = {
  from: "SFO",
  to: "LAX",
  depart: "2026-12-04",
  returnDate: "2026-12-08",
  travelers: 1,
};

function cheapest(options: TravelOption[]) {
  return [...options].sort((a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity))[0];
}

function OptionList({ title, options }: { title: string; options: TravelOption[] }) {
  const best = cheapest(options);
  return (
    <section className="space-y-2">
      <h2 className="font-serif text-2xl">{title}</h2>
      <ul className="space-y-2">
        {options.map((option) => (
          <li key={option.id} className="rounded-3xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-wide text-primary uppercase">{option.provider}</p>
                <p className="font-semibold">{option.title}</p>
                <p className="text-sm text-muted-foreground">{option.detail}</p>
              </div>
              <p className="text-right font-serif text-2xl leading-none">
                {option.priceKind === "sample" && (
                  <span className="mb-1 block font-sans text-[10px] font-bold uppercase">Sample</span>
                )}
                {option.amount == null ? "See site" : money(option.amount)}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {best?.id === option.id && option.amount != null && (
                <span className="inline-flex h-10 items-center rounded-full bg-lime px-3 text-xs font-bold text-ink">
                  {option.priceKind === "live" ? "Cheapest live" : "Lowest sample"}
                </span>
              )}
              <a
                href={option.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center rounded-full bg-ink px-3 text-sm font-bold text-white"
              >
                Open {option.provider}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TravelScreen() {
  const { profile } = useProfile();
  const [query, setQuery] = useState<TripQuery>(emptyQuery);
  const [result, setResult] = useState<(TravelSearch & { query: TripQuery }) | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [dismissedUpgrade, setDismissedUpgrade] = useState(false);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [savedOverride, setSavedOverride] = useState<SavedTrip[] | null>(null);
  const saved =
    savedOverride ??
    (isClient
      ? (() => {
          try {
            const raw = localStorage.getItem(SAVED_KEY);
            const parsed = raw ? (JSON.parse(raw) as SavedTrip[]) : [];
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : []);

  const member = profile?.plan === "hand";
  const upgrade = Boolean(profile) && !member && !dismissedUpgrade;

  function persist(next: SavedTrip[]) {
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    setSavedOverride(next);
  }

  async function search(event?: React.FormEvent) {
    event?.preventDefault();
    if (!member) {
      setDismissedUpgrade(false);
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      });
      const data = (await response.json()) as TravelSearch & { ok?: boolean; message?: string; query: TripQuery };
      if (!response.ok || data.ok === false) throw new Error(data.message || "Search failed.");
      setResult(data);
      const flight = cheapest(data.flights);
      const next = saved.map((trip) => {
        const same =
          trip.from === data.query.from &&
          trip.to === data.query.to &&
          trip.depart === data.query.depart &&
          trip.returnDate === data.query.returnDate &&
          trip.travelers === data.query.travelers;
        if (!same || trip.savedKind !== "live" || flight?.priceKind !== "live" || trip.savedFlight == null || flight.amount == null) {
          return trip;
        }
        if (flight.amount < trip.savedFlight - 0.5) {
          return {
            ...trip,
            alert: `Price drop: this live flight is ${money(trip.savedFlight - flight.amount)} under the ${money(trip.savedFlight)} you saved.`,
            savedFlight: flight.amount,
          };
        }
        return { ...trip, alert: "Watching this trip. No live price drop since you saved it." };
      });
      if (next.some((trip, index) => trip.alert !== saved[index]?.alert)) persist(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search failed.");
    } finally {
      setPending(false);
    }
  }

  function saveTrip() {
    if (!result) return;
    const flight = cheapest(result.flights);
    const trip: SavedTrip = {
      id: `${result.query.from}-${result.query.to}-${result.query.depart}`,
      ...result.query,
      savedFlight: flight?.amount ?? null,
      savedKind: flight?.priceKind ?? null,
      alert:
        flight?.priceKind === "live"
          ? "Watching this trip. No live price drop since you saved it."
          : "Saved. Sample prices are not a live feed, so LifeSaver will not call a drop until a real fare is connected.",
    };
    persist([trip, ...saved.filter((item) => item.id !== trip.id)]);
  }

  if (!profile) return null;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Cheapest travel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Flights, stays, cars, and a drive estimate.</p>
        </div>
        <PlanChip />
      </header>

      <form className="space-y-3 rounded-3xl border-2 border-ink/10 bg-card p-4" onSubmit={search}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="trip-from">From</Label>
            <Input id="trip-from" value={query.from} onChange={(event) => setQuery({ ...query, from: event.target.value })} className="h-12 rounded-2xl" />
          </div>
          <div>
            <Label htmlFor="trip-to">To</Label>
            <Input id="trip-to" value={query.to} onChange={(event) => setQuery({ ...query, to: event.target.value })} className="h-12 rounded-2xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="trip-depart">Depart</Label>
            <Input id="trip-depart" type="date" value={query.depart} onChange={(event) => setQuery({ ...query, depart: event.target.value })} className="h-12 rounded-2xl" />
          </div>
          <div>
            <Label htmlFor="trip-return">Return</Label>
            <Input id="trip-return" type="date" value={query.returnDate} onChange={(event) => setQuery({ ...query, returnDate: event.target.value })} className="h-12 rounded-2xl" />
          </div>
        </div>
        <div>
          <Label htmlFor="trip-people">Travelers</Label>
          <Input
            id="trip-people"
            inputMode="numeric"
            value={String(query.travelers)}
            onChange={(event) => setQuery({ ...query, travelers: Number(event.target.value.replace(/\D/g, "")) || 1 })}
            className="h-12 rounded-2xl"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="h-12 w-full rounded-full" disabled={pending}>
          {pending ? "Searching…" : member ? "Find the cheapest" : "Unlock with Lend a Hand"}
        </Button>
      </form>

      {result && member && (
        <div className="space-y-4">
          <p className="rounded-2xl bg-lime px-3 py-3 text-sm font-semibold text-ink">{result.notice}</p>
          <OptionList title="Flights" options={result.flights} />
          <OptionList title="Stays" options={result.stays} />
          <OptionList title="Rental cars" options={result.cars} />
          <section className="rounded-3xl bg-ink p-4 text-white">
            <h2 className="font-serif text-2xl">Drive vs fly</h2>
            <p className="mt-2 text-sm text-white/80">{result.drive.note}</p>
            <p className="mt-3 font-serif text-3xl">
              {result.drive.fuelCost == null ? "Fuel n/a" : `Est. ${money(result.drive.fuelCost)} gas`}
            </p>
            {result.drive.flightCost != null && (
              <p className="text-sm">
                {result.drive.flightKind === "sample" ? "Sample" : "Live"} flight {money(result.drive.flightCost)}
              </p>
            )}
            <a href={result.drive.href} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-11 items-center rounded-full bg-lime px-4 text-sm font-bold text-ink">
              Open driving directions
            </a>
          </section>
          <Button type="button" variant="outline" className="h-12 w-full rounded-full" onClick={saveTrip}>
            Save trip for price-drop alerts
          </Button>
        </div>
      )}

      {saved.length > 0 && (
        <section aria-labelledby="alerts-heading" className="space-y-2">
          <h2 id="alerts-heading" className="font-serif text-2xl">Price-drop alerts</h2>
          <ul className="space-y-2">
            {saved.map((trip) => (
              <li key={trip.id} className="rounded-2xl border bg-card px-3 py-3 text-sm">
                <p className="font-semibold">
                  {trip.from} to {trip.to}
                </p>
                <p className="text-muted-foreground">
                  {trip.depart} to {trip.returnDate} · {trip.travelers} travelers
                </p>
                <p>{trip.alert}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={upgrade} onOpenChange={(open) => setDismissedUpgrade(!open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="font-serif text-2xl">Travel is in Lend a Hand.</DialogTitle>
            <DialogDescription>
              Cheapest flights, hotels, and cars are included with Lend a Hand. Founding members lock{" "}
              {FOUNDING_HAND_LABEL}/mo for life. After launch it is {HAND_PRICE_LABEL}/mo. It includes
              everything in Premium. This demo does not charge a card.
            </DialogDescription>
          </DialogHeader>
          <Button asChild className="h-12 rounded-full">
            <Link href="/pricing">See Lend a Hand, {FOUNDING_HAND_LABEL} for life</Link>
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
