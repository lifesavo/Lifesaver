"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useProfile } from "@/lib/profile";
import { FOUNDING_HAND_LABEL, HAND_PRICE_LABEL } from "@/lib/pricing";
import type { RoadsideIssue } from "@/lib/roadside/info";
import { ago, COMMUNITY_NOTE, directionsLink, ISSUE_EMOJI, issueLabel, type RoadsideRequestView, useSpot } from "@/components/roadside/shared";

export function HelpersScreen() {
  const { profile } = useProfile();
  const { spot, status, locate } = useSpot();
  const [open, setOpen] = useState<RoadsideRequestView[]>([]);
  const [mine, setMine] = useState<RoadsideRequestView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const load = useCallback(async () => {
    try {
      const [mineRes, openRes] = await Promise.all([
        fetch("/api/roadside/requests?mine=1").then((r) => r.json() as Promise<{ requests?: RoadsideRequestView[] }>),
        spot ? fetch(`/api/roadside/requests?lat=${spot.lat.toFixed(4)}&lng=${spot.lng.toFixed(4)}&radius=50`).then((r) => r.json() as Promise<{ requests?: RoadsideRequestView[] }>) : Promise.resolve({ requests: [] }),
      ]);
      setMine((mineRes.requests ?? []).filter((r) => r.role === "helper"));
      setOpen((openRes.requests ?? []).filter((r) => r.role !== "requester"));
      setLoaded(true);
    } catch {
      setError("Could not load requests.");
    }
  }, [spot]);

  useEffect(() => {
    queueMicrotask(() => void load());
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [load]);

  async function accept(id: string) {
    setError("");
    const response = await fetch("/api/roadside/requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "accept", name, phone }) });
    const data = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || !data.ok) setError(data.message || "Could not accept.");
    setAccepting(null);
    void load();
  }

  async function act(id: string, action: "done" | "release") {
    await fetch("/api/roadside/requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    void load();
  }

  const activeJobs = mine.filter((r) => r.status === "accepted");

  return (
    <div className="space-y-4 pb-24">
      <header className="rounded-3xl bg-ink px-5 py-5 text-white">
        <p className="text-xs font-bold tracking-wide text-lime uppercase">Lend a Hand · Roadside</p>
        <h1 className="font-serif text-3xl leading-tight">Help a stranded driver nearby</h1>
        <p className="mt-2 text-sm text-white/80">
          Helping is included with Lend a Hand ({HAND_PRICE_LABEL}/mo, or {FOUNDING_HAND_LABEL}/mo for life as a founding member). During early access anyone signed in can accept, and nothing is charged.
          {profile && profile.plan !== "hand" ? " " : ""}
        </p>
        {profile && profile.plan !== "hand" && (
          <Link href="/pricing" className="mt-2 inline-block text-sm font-semibold text-lime underline">Get Lend a Hand</Link>
        )}
      </header>

      <p className="rounded-2xl bg-sun/60 px-3 py-2 text-xs text-ink">
        Only stop where it&apos;s safe and legal. Never park in a traffic lane. If someone is hurt or in danger, call 911. You are helping as a neighbor, not as a professional.
      </p>

      {activeJobs.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-serif text-2xl">Your active help</h2>
          {activeJobs.map((r) => (
            <article key={r.id} className="rounded-3xl bg-lime p-4 text-ink">
              <p className="text-xs font-bold uppercase">{ISSUE_EMOJI[r.issue as RoadsideIssue]} {issueLabel(r.issue)} · accepted {r.acceptedAt ? ago(r.acceptedAt) : ""}</p>
              <p className="mt-1 font-serif text-2xl">{r.requester?.name} is waiting</p>
              {r.note && <p className="text-sm">“{r.note}”</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={directionsLink(r.lat, r.lng)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-full bg-ink px-4 text-sm font-bold text-white">Directions</a>
                {r.requester && <a href={`tel:${r.requester.phone}`} className="inline-flex h-11 items-center rounded-full border-2 border-ink px-4 text-sm font-bold">Call</a>}
                {r.requester && <a href={`sms:${r.requester.phone}`} className="inline-flex h-11 items-center rounded-full border-2 border-ink px-4 text-sm font-bold">Text</a>}
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => void act(r.id, "done")} className="h-10 rounded-full bg-ink px-4 text-xs font-bold text-white">Mark done</button>
                <button type="button" onClick={() => void act(r.id, "release")} className="h-10 rounded-full border-2 border-ink px-4 text-xs font-bold">I can&apos;t make it</button>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Open requests near you</h2>
          <button type="button" onClick={() => { locate(); void load(); }} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-bold">
            <RefreshCw className="size-3.5" aria-hidden="true" /> Refresh
          </button>
        </div>
        {!spot && <p className="text-sm text-muted-foreground">{status}</p>}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        {spot && loaded && open.length === 0 && <p className="rounded-2xl border border-dashed px-3 py-4 text-sm text-muted-foreground">No open requests within 50 miles right now. This list refreshes every 15 seconds.</p>}
        <ul className="space-y-2">
          {open.map((r) => (
            <li key={r.id} className="rounded-3xl border-2 border-ink/10 bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">
                  {ISSUE_EMOJI[r.issue as RoadsideIssue]} {issueLabel(r.issue)}
                </p>
                <p className="shrink-0 text-right text-sm font-bold">{r.miles != null ? `${r.miles} mi` : ""}</p>
              </div>
              <p className="text-xs text-muted-foreground">Asked {ago(r.createdAt)} · approximate area until you accept</p>
              {r.note && <p className="mt-1 text-sm">“{r.note}”</p>}
              {accepting === r.id ? (
                <form
                  className="mt-2 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void accept(r.id);
                  }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" aria-label="Your first name" className="h-11 rounded-2xl border px-3 text-base" />
                    <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your phone" aria-label="Your phone" className="h-11 rounded-2xl border px-3 text-base" />
                  </div>
                  <p className="text-xs text-muted-foreground">They&apos;ll see your first name and phone. You&apos;ll get their exact spot and number.</p>
                  <div className="flex gap-2">
                    <button type="submit" className="h-11 flex-1 rounded-full bg-primary text-sm font-bold text-primary-foreground">Accept and head over</button>
                    <button type="button" onClick={() => setAccepting(null)} className="h-11 rounded-full border px-4 text-sm">Back</button>
                  </div>
                </form>
              ) : (
                <button type="button" onClick={() => setAccepting(r.id)} className="mt-2 h-11 w-full rounded-full bg-ink text-sm font-bold text-white">
                  I can help
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-muted-foreground">{COMMUNITY_NOTE}</p>
      <Link href="/roadside" className="block text-center text-sm font-semibold text-primary">Need help yourself? Roadside Help</Link>
    </div>
  );
}
