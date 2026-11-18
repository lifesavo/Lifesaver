"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlanChip } from "@/components/plan-chip";
import { Button } from "@/components/ui/button";
import { cheapest, rideOptions } from "@/lib/rides";
import { money } from "@/lib/money";
import { useProfile } from "@/lib/profile";

type EventRow = {
  id: number;
  kind: "girls" | "guys";
  eventDate: string;
  venue: string;
  deal: string;
  capacity: number;
  publicRsvp: boolean;
  rsvpCount: number;
  youRsvped: boolean;
};

type Payload = {
  ok: boolean;
  city: { id: string; name: string } | null;
  events: EventRow[];
  comingSoon: boolean;
  founding: boolean;
  ranking: { id: string; name: string; votes: number }[];
  message?: string;
};

const kindLabel = { girls: "Girls' Night Out", guys: "Guys' Night Out" };

export function NightsScreen() {
  const { profile } = useProfile();
  const [data, setData] = useState<Payload | null>(null);
  const [pick, setPick] = useState("nyc");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!profile) return;
    const response = await fetch(`/api/nights?zip=${profile.zip}&email=${encodeURIComponent(profile.email)}`);
    setData((await response.json()) as Payload);
  }

  useEffect(() => {
    let cancel = false;
    if (!profile) return;
    void fetch(`/api/nights?zip=${profile.zip}&email=${encodeURIComponent(profile.email)}`)
      .then((response) => response.json())
      .then((payload: Payload) => {
        if (!cancel) setData(payload);
      });
    return () => {
      cancel = true;
    };
  }, [profile]);

  if (!profile) return null;
  const current = profile;
  const rides = rideOptions.filter((option) => option.kind === "ride");
  const cheap = cheapest(rides);
  const uber = rides.find((option) => option.id === "uber");
  const lyft = rides.find((option) => option.id === "lyft");
  const posted = new Set(data?.events.map((event) => event.kind) ?? []);
  const missing = (["girls", "guys"] as const).filter((kind) => data?.city && !posted.has(kind));

  async function vote(cityId: string) {
    setError("");
    const response = await fetch("/api/nights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vote", email: current.email, cityId }),
    });
    const body = (await response.json()) as { ok?: boolean; message?: string; already?: boolean; count?: number; city?: string };
    if (!response.ok || body.ok === false) {
      setError(body.message || "Vote failed.");
      return;
    }
    setMessage(
      body.already
        ? `You already asked for nights in ${body.city}.`
        : `Vote counted. ${body.city} has ${body.count} requests.`,
    );
    await load();
  }

  async function rsvp(eventId: number) {
    setError("");
    const response = await fetch("/api/nights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rsvp", email: current.email, eventId }),
    });
    const body = (await response.json()) as { ok?: boolean; message?: string; already?: boolean };
    if (!response.ok || body.ok === false) {
      setError(body.message || "RSVP failed.");
      return;
    }
    setMessage(body.already ? "You're already on the list for that night." : "You're RSVP'd.");
    await load();
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">LifeSaver Nights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.city ? data.city.name : `ZIP ${profile.zip}`} · monthly nights out
          </p>
        </div>
        <PlanChip />
      </header>

      {!data && <p role="status">Checking your city…</p>}

      {data && !data.city && (
        <p className="rounded-2xl bg-muted px-3 py-3 text-sm">
          {profile.zip} is not in a launch metro yet. Ask for a city below. Nothing is scheduled until the team posts it.
        </p>
      )}

      {data?.city && missing.length > 0 && (
        <section className="space-y-2">
          {missing.map((kind) => (
            <article key={kind} className="rounded-3xl border bg-card p-4">
              <p className="text-xs font-bold tracking-wide text-primary uppercase">Monthly</p>
              <h2 className="font-serif text-2xl">{kindLabel[kind]}</h2>
              <p className="mt-1 text-sm font-semibold">Coming soon</p>
              <p className="text-sm text-muted-foreground">
                No date, venue, or deal is posted for {data.city?.name}.
              </p>
            </article>
          ))}
          <Button type="button" className="h-12 w-full rounded-full" onClick={() => void vote(data.city!.id)}>
            Request LifeSaver Nights in your city
          </Button>
        </section>
      )}

      {data?.events.map((event) => {
        const venueQuery = encodeURIComponent(`${event.venue}, ${data.city?.name ?? ""}`);
        const uberHref = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${venueQuery}`;
        const lyftHref = `https://lyft.com/ride?id=lyft&destination[address]=${venueQuery}`;
        const earlyOnly = !event.publicRsvp;
        return (
          <article key={event.id} className="space-y-3 rounded-3xl border-2 border-ink/10 bg-card p-4">
            <p className="text-xs font-bold tracking-wide text-primary uppercase">{kindLabel[event.kind]}</p>
            <h2 className="font-serif text-2xl">{event.eventDate}</h2>
            <p className="text-sm">{event.venue}</p>
            <p className="rounded-2xl bg-lime px-3 py-2 text-sm font-semibold text-ink">
              Member deal: {event.deal}
            </p>
            <p className="text-xs text-muted-foreground">
              {event.rsvpCount} of {event.capacity} spots.{" "}
              {earlyOnly ? "Founding members can RSVP first." : "RSVP is open to members."}
            </p>
            {event.youRsvped ? (
              <p className="text-sm font-semibold" role="status">You&apos;re RSVP&apos;d.</p>
            ) : (
              <Button type="button" className="h-12 w-full rounded-full" onClick={() => void rsvp(event.id)}>
                {earlyOnly && !data.founding ? "Founding RSVP" : "RSVP"}
              </Button>
            )}
            <div className="rounded-2xl bg-muted px-3 py-3 text-sm">
              <p className="font-semibold">Ride there</p>
              <p className="text-muted-foreground">
                Sample fares, not live quotes. {cheap.name} is {money(cheap.price)} in the usual sample. LifeSaver is not an Uber or Lyft partner.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={uberHref} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full bg-ink px-3 text-sm font-bold text-white">
                  Uber · sample {uber ? money(uber.price) : ""}
                </a>
                <a href={lyftHref} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full bg-ink px-3 text-sm font-bold text-white">
                  Lyft · sample {lyft ? money(lyft.price) : ""}
                </a>
              </div>
            </div>
          </article>
        );
      })}

      {message && <p className="text-sm font-semibold" role="status">{message}</p>}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <section aria-labelledby="demand-heading" className="space-y-2">
        <h2 id="demand-heading" className="font-serif text-2xl">Where to start</h2>
        <p className="text-sm text-muted-foreground">Cities ranked by requests. No event is implied by a vote.</p>
        <ul className="overflow-hidden rounded-2xl border bg-card">
          {data?.ranking.slice(0, 8).map((city, index) => (
            <li key={city.id} className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0">
              <span>{index + 1}. {city.name}</span>
              <span className="tabular-nums">{city.votes}</span>
            </li>
          ))}
        </ul>
        {data && !data.city && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold">
              City
              <select
                value={pick}
                onChange={(event) => setPick(event.target.value)}
                className="mt-1 h-12 w-full rounded-2xl border bg-card px-3"
              >
                {data.ranking.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" className="h-12 w-full rounded-full" onClick={() => void vote(pick)}>
              Request LifeSaver Nights in your city
            </Button>
          </div>
        )}
        {data?.city && missing.length === 0 && (
          <Button type="button" variant="outline" className="h-11 w-full rounded-full" onClick={() => void vote(data.city!.id)}>
            Request LifeSaver Nights in your city
          </Button>
        )}
        {!data?.founding && (
          <p className="text-sm text-muted-foreground">
            Founding members RSVP before everyone else. <Link href="/#waitlist" className="font-semibold text-primary">Join the waitlist</Link> with {profile.email}.
          </p>
        )}
      </section>
    </div>
  );
}
