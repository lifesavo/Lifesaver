"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarPlus, MapPin, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlanChip } from "@/components/plan-chip";
import { INTERESTS, isoDate, itineraryToIcs, type Interest, type Itinerary, type PlanInput } from "@/lib/travel/itinerary";
import { useProfile } from "@/lib/profile";

const SAVED_KEY = "lifesaver.itineraries.v1";

function defaultInput(): PlanInput {
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  return { destination: "", origin: "", start: isoDate(start), end: isoDate(end), travelers: 2, budget: null, interests: [] };
}

function readSaved(): Itinerary[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const parsed = raw ? (JSON.parse(raw) as Itinerary[]) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item && Array.isArray(item.days)) : [];
  } catch {
    return [];
  }
}

function downloadIcs(plan: Itinerary) {
  const blob = new Blob([itineraryToIcs(plan)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${plan.input.destination.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${plan.input.start}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slotColor = { morning: "bg-sun/70", afternoon: "bg-cyan/70", evening: "bg-ink text-white" } as const;

function PlanView({ plan, saved, onSave }: { plan: Itinerary; saved: boolean; onSave: () => void }) {
  return (
    <div className="space-y-4" id="plan-result">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#e01470] via-[#6d28d9] to-[#0891b2] px-5 py-5 text-white">
        <p className="text-xs font-bold tracking-wide text-lime uppercase">Your itinerary</p>
        <h2 className="mt-1 font-serif text-3xl leading-tight">{plan.title}</h2>
        <p className="mt-1 text-sm text-white/85">
          {plan.input.start} to {plan.input.end} · {plan.input.travelers} traveler{plan.input.travelers === 1 ? "" : "s"}
          {plan.input.origin ? ` · from ${plan.input.origin}` : ""}
        </p>
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[11px]">
          <Sparkles className="size-3" aria-hidden="true" />
          {plan.enriched ? "AI-picked places. Double-check hours before you go." : "Smart template plan. Tap any stop for top-rated picks on the map."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={onSave} disabled={saved} className="h-11 rounded-full bg-lime text-ink hover:bg-lime/90">
            {saved ? "Saved" : "Save trip"}
          </Button>
          <Button type="button" variant="outline" onClick={() => downloadIcs(plan)} className="h-11 rounded-full border-white bg-transparent text-white hover:bg-white/10">
            <CalendarPlus className="size-4" aria-hidden="true" /> Add to calendar
          </Button>
        </div>
      </section>

      {plan.days.map((day) => (
        <section key={day.date} className="rounded-3xl border-2 border-ink/10 bg-card p-4">
          <p className="text-xs font-bold tracking-wide text-primary uppercase">{day.label}</p>
          <h3 className="font-serif text-2xl leading-tight">{day.theme}</h3>
          <ol className="mt-3 space-y-2">
            {day.slots.map((slot) => (
              <li key={slot.time} className="flex gap-3">
                <span className={`mt-0.5 inline-flex h-7 w-20 shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase ${slotColor[slot.time]}`}>
                  {slot.time}
                </span>
                <div className="min-w-0">
                  {slot.href ? (
                    <a href={slot.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold underline decoration-lime decoration-2 underline-offset-4">
                      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                      {slot.title}
                    </a>
                  ) : (
                    <p className="font-semibold">{slot.title}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {slot.start}–{slot.end} · {slot.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section className="space-y-2">
        <h2 className="font-serif text-2xl">Compare prices</h2>
        <p className="text-sm text-muted-foreground">Live prices open on each site with your dates. LifeSaver doesn&apos;t show made-up fares.</p>
        <ul className="grid grid-cols-1 gap-2">
          {plan.links.map((link) => (
            <li key={link.label}>
              <a href={link.href} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
                <span>
                  <span className="block font-semibold">{link.label}</span>
                  <span className="block text-xs text-muted-foreground">{link.detail}</span>
                </span>
                <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">Open</span>
              </a>
            </li>
          ))}
        </ul>
        <Link href="/travel" className="block rounded-2xl bg-cyan px-4 py-3 text-sm font-bold text-ink">
          Lend a Hand members: find the cheapest flights, stays, and cars in Travel
        </Link>
      </section>

      <section className="rounded-3xl bg-lime p-4 text-ink">
        <h2 className="font-serif text-2xl">Budget split</h2>
        {plan.budget ? (
          <ul className="mt-2 space-y-2">
            {plan.budget.map((line) => (
              <li key={line.id} className="flex items-baseline justify-between gap-3">
                <span>
                  <span className="block font-semibold">{line.label}</span>
                  <span className="block text-xs">{line.note}</span>
                </span>
                <span className="font-serif text-xl tabular-nums">
                  <span className="mr-1 font-sans text-[10px] font-bold uppercase">Est.</span>${line.amount.toLocaleString("en-US")}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-2 text-xs">{plan.budgetNote}</p>
      </section>

      <section className="rounded-3xl border-2 border-ink/10 bg-card p-4">
        <h2 className="font-serif text-2xl">Packing list</h2>
        <ul className="mt-2 space-y-1.5">
          {plan.packing.map((item) => (
            <li key={item}>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5 size-4 accent-[#e01470]" />
                {item}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <ul className="space-y-1 text-xs text-muted-foreground">
        {plan.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

export function PlanScreen() {
  const { profile } = useProfile();
  const params = useSearchParams();
  const [input, setInput] = useState<PlanInput>(defaultInput);
  const [ask, setAsk] = useState("");
  const [plan, setPlan] = useState<Itinerary | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [savedOverride, setSavedOverride] = useState<Itinerary[] | null>(null);
  const saved = savedOverride ?? (isClient ? readSaved() : []);
  const ran = useRef(false);

  function persist(next: Itinerary[]) {
    localStorage.setItem(SAVED_KEY, JSON.stringify(next.slice(0, 30)));
    setSavedOverride(next.slice(0, 30));
  }

  async function generate(body: Partial<PlanInput> & { text?: string }) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string; plan?: Itinerary; parsed?: Partial<PlanInput> };
      if (data.parsed) {
        const parsed = data.parsed;
        setInput((current) => ({ ...current, ...Object.fromEntries(Object.entries(parsed).filter(([k, v]) => k !== "missing" && v != null)) }));
      }
      if (!response.ok || !data.ok || !data.plan) throw new Error(data.message || "I couldn't plan that. Try again.");
      setPlan(data.plan);
      setInput(data.plan.input);
      setTimeout(() => document.getElementById("plan-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "I couldn't plan that. Try again.");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    if (ran.current) return;
    const q = params.get("q");
    const open = params.get("open");
    if (open) {
      const found = readSaved().find((item) => item.id === open);
      if (found) {
        ran.current = true;
        queueMicrotask(() => {
          setPlan(found);
          setInput(found.input);
        });
        return;
      }
    }
    if (q) {
      ran.current = true;
      queueMicrotask(() => {
        setAsk(q);
        void generate({ text: q });
      });
    }
  }, [params]);

  function toggleInterest(id: Interest) {
    setInput((current) => ({
      ...current,
      interests: current.interests.includes(id) ? current.interests.filter((item) => item !== id) : [...current.interests, id],
    }));
  }

  // Mirror saved trips to the server so the user's own AI (with their token) can see them.
  useEffect(() => {
    let cancel = false;
    fetch("/api/me/trips")
      .then((r) => r.json())
      .then((data: { trips?: Itinerary[] }) => {
        if (cancel || !Array.isArray(data.trips) || !data.trips.length) return;
        const local = readSaved();
        const extra = data.trips.filter((t) => t && Array.isArray(t.days) && !local.some((l) => l.id === t.id));
        if (extra.length) persist([...extra, ...local]);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  function save() {
    if (!plan) return;
    persist([plan, ...saved.filter((item) => item.id !== plan.id)]);
    void fetch("/api/me/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan) }).catch(() => {});
  }

  function remove(id: string) {
    persist(saved.filter((item) => item.id !== id));
    if (plan?.id === id) setPlan(null);
    void fetch(`/api/me/trips?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  if (!profile) return null;
  const isSaved = Boolean(plan && saved.some((item) => item.id === plan.id));

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Trip planner</h1>
          <p className="mt-1 text-sm text-muted-foreground">Day-by-day plans, budget, packing, and your calendar. Free for everyone.</p>
        </div>
        <PlanChip />
      </header>

      <form
        className="space-y-2 rounded-3xl bg-ink p-4 text-white"
        onSubmit={(event) => {
          event.preventDefault();
          if (ask.trim().length > 3) void generate({ text: ask });
        }}
      >
        <Label htmlFor="plan-ask" className="text-lime">
          Just say it
        </Label>
        <textarea
          id="plan-ask"
          value={ask}
          onChange={(event) => setAsk(event.target.value)}
          rows={2}
          placeholder="Plan a 3-day trip to Nashville Dec 5-7 for 2, $800"
          className="w-full rounded-2xl bg-white px-3 py-2 text-base text-ink"
        />
        <Button type="submit" className="h-12 w-full rounded-full bg-lime text-ink hover:bg-lime/90" disabled={pending}>
          {pending ? "Planning…" : "Plan my trip"}
        </Button>
      </form>

      <details className="rounded-3xl border-2 border-ink/10 bg-card p-4" open={!ask && !plan}>
        <summary className="cursor-pointer font-semibold">Or fill in the details</summary>
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void generate(input);
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="plan-to">Where to</Label>
              <Input id="plan-to" required value={input.destination} placeholder="Nashville" onChange={(event) => setInput({ ...input, destination: event.target.value })} className="h-12 rounded-2xl" />
            </div>
            <div>
              <Label htmlFor="plan-from">From (optional)</Label>
              <Input id="plan-from" value={input.origin} placeholder="Kansas City" onChange={(event) => setInput({ ...input, origin: event.target.value })} className="h-12 rounded-2xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="plan-start">Start</Label>
              <Input id="plan-start" type="date" required value={input.start} onChange={(event) => setInput({ ...input, start: event.target.value })} className="h-12 rounded-2xl" />
            </div>
            <div>
              <Label htmlFor="plan-end">End</Label>
              <Input id="plan-end" type="date" required value={input.end} onChange={(event) => setInput({ ...input, end: event.target.value })} className="h-12 rounded-2xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="plan-people">Travelers</Label>
              <Input
                id="plan-people"
                inputMode="numeric"
                value={String(input.travelers)}
                onChange={(event) => setInput({ ...input, travelers: Number(event.target.value.replace(/\D/g, "")) || 1 })}
                className="h-12 rounded-2xl"
              />
            </div>
            <div>
              <Label htmlFor="plan-budget">Total budget $</Label>
              <Input
                id="plan-budget"
                inputMode="numeric"
                value={input.budget == null ? "" : String(input.budget)}
                placeholder="800"
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, "");
                  setInput({ ...input, budget: digits ? Number(digits) : null });
                }}
                className="h-12 rounded-2xl"
              />
            </div>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Into</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {INTERESTS.map((interest) => {
                const on = input.interests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleInterest(interest.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${on ? "bg-primary text-primary-foreground" : "bg-muted text-ink"}`}
                  >
                    {interest.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Button type="submit" className="h-12 w-full rounded-full" disabled={pending}>
            {pending ? "Planning…" : "Build the itinerary"}
          </Button>
        </form>
      </details>

      {error && (
        <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {plan && <PlanView plan={plan} saved={isSaved} onSave={save} />}

      {saved.length > 0 && (
        <section aria-labelledby="saved-trips" className="space-y-2">
          <h2 id="saved-trips" className="font-serif text-2xl">Saved trips</h2>
          <p className="text-xs text-muted-foreground">Saved on this device. Want your own AI to see them? <Link href="/ai" className="underline">Connect it</Link>.</p>
          <ul className="space-y-2">
            {saved.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-2xl border bg-card px-3 py-3 text-sm">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    setPlan(item);
                    setInput(item.input);
                    setTimeout(() => document.getElementById("plan-result")?.scrollIntoView({ behavior: "smooth" }), 50);
                  }}
                >
                  <span className="block font-semibold">{item.title}</span>
                  <span className="block text-muted-foreground">
                    {item.input.start} to {item.input.end} · {item.input.travelers} traveler{item.input.travelers === 1 ? "" : "s"}
                  </span>
                </button>
                <button type="button" aria-label={`Add ${item.title} to calendar`} className="rounded-full p-2" onClick={() => downloadIcs(item)}>
                  <CalendarPlus className="size-4" aria-hidden="true" />
                </button>
                <button type="button" aria-label={`Delete ${item.title}`} className="rounded-full p-2 text-destructive" onClick={() => remove(item.id)}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
