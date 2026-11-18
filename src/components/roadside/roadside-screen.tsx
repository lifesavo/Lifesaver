"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, MapPin, MessageSquare, RefreshCw } from "lucide-react";
import { PICKER_ISSUES, ROADSIDE, ROADSIDE_SAFETY, type RoadsideIssue } from "@/lib/roadside/info";
import type { FuelLookup } from "@/lib/fuel/types";
import { money } from "@/lib/money";
import {
  ago,
  Call911,
  COMMUNITY_NOTE,
  directionsLink,
  ISSUE_EMOJI,
  issueLabel,
  mapsLink,
  nearLink,
  type RoadsideRequestView,
  useSpot,
} from "@/components/roadside/shared";

const HELP_LINKS: Record<RoadsideIssue, string[]> = {
  flat_tire: ["tow truck", "tire shop", "mobile tire repair"],
  breakdown: ["tow truck", "auto repair", "mobile mechanic"],
  out_of_gas: ["fuel delivery", "gas station", "tow truck"],
  lockout: ["car locksmith", "tow truck"],
  jump_start: ["mobile car battery service", "auto parts store", "tow truck"],
  accident: ["tow truck", "auto body shop"],
  wont_start: ["tow truck", "auto repair"],
};

function NearbyGas({ lat, lng }: { lat: number; lng: number }) {
  const [data, setData] = useState<FuelLookup | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancel = false;
    fetch(`/api/fuel?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&radius=8000`)
      .then((r) => r.json())
      .then((d: FuelLookup & { ok?: boolean; message?: string }) => {
        if (cancel) return;
        if (d.ok === false) setError(d.message || "Gas lookup failed.");
        else setData(d);
      })
      .catch(() => !cancel && setError("Gas lookup failed."));
    return () => {
      cancel = true;
    };
  }, [lat, lng]);
  if (error) return <p className="text-sm text-muted-foreground">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Finding the nearest stations…</p>;
  const top = [...data.stations].sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 4);
  if (!top.length) return <p className="text-sm text-muted-foreground">No stations found within 5 miles. Try fuel delivery or a tow.</p>;
  return (
    <ul className="space-y-2">
      {top.map((s) => {
        const p = s.prices.regular;
        return (
          <li key={s.id}>
            <a href={directionsLink(s.lat, s.lng)} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block font-semibold">{s.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {(s.distanceMeters / 1609.34).toFixed(1)} mi · {p ? `${p.kind === "live" ? "" : p.kind === "reported" ? "reported " : "est. "}${money(p.amount)} regular` : "no price listed"}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">Directions</span>
            </a>
          </li>
        );
      })}
      <li className="text-xs text-muted-foreground">{data.notice}</li>
    </ul>
  );
}

function StatusCard({ request, onChange }: { request: RoadsideRequestView; onChange: (r: RoadsideRequestView) => void }) {
  const [busy, setBusy] = useState(false);
  async function act(action: "cancel" | "done") {
    setBusy(true);
    try {
      const response = await fetch("/api/roadside/requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: request.id, action }) });
      const data = (await response.json()) as { request?: RoadsideRequestView };
      if (data.request) onChange(data.request);
    } finally {
      setBusy(false);
    }
  }
  const tone =
    request.status === "accepted" ? "bg-lime text-ink" : request.status === "open" ? "bg-sun text-ink" : "bg-muted text-ink";
  return (
    <div className={`rounded-3xl p-4 ${tone}`} role="status" aria-live="polite">
      <p className="text-xs font-bold tracking-wide uppercase">
        {ISSUE_EMOJI[request.issue as RoadsideIssue]} {issueLabel(request.issue)} · asked {ago(request.createdAt)}
      </p>
      {request.status === "open" && !request.expired && (
        <>
          <p className="mt-1 font-serif text-2xl leading-tight">Waiting for a nearby helper…</p>
          <p className="mt-1 text-sm">Your request is on the nearby helpers list. This page checks every few seconds. Keep trying a tow too, since nobody is guaranteed to answer.</p>
        </>
      )}
      {request.status === "open" && request.expired && <p className="mt-1 font-serif text-2xl leading-tight">No helper took this one. It has dropped off the list.</p>}
      {request.status === "accepted" && request.helper && (
        <>
          <p className="mt-1 font-serif text-2xl leading-tight">{request.helper.name} accepted and has your location.</p>
          <p className="mt-1 text-sm">They are a community member, not a pro. Call or text to confirm before you count on them.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a href={`tel:${request.helper.phone}`} className="inline-flex h-11 items-center rounded-full bg-ink px-4 text-sm font-bold text-white">Call {request.helper.name}</a>
            <a href={`sms:${request.helper.phone}`} className="inline-flex h-11 items-center rounded-full border-2 border-ink px-4 text-sm font-bold">Text</a>
          </div>
        </>
      )}
      {request.status === "done" && <p className="mt-1 font-serif text-2xl leading-tight">Marked done. Glad you&apos;re moving.</p>}
      {request.status === "cancelled" && <p className="mt-1 font-serif text-2xl leading-tight">Cancelled.</p>}
      {(request.status === "open" || request.status === "accepted") && (
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={busy} onClick={() => void act("done")} className="h-10 rounded-full bg-ink px-4 text-xs font-bold text-white">I&apos;m all set</button>
          <button type="button" disabled={busy} onClick={() => void act("cancel")} className="h-10 rounded-full border-2 border-ink px-4 text-xs font-bold">Cancel request</button>
        </div>
      )}
    </div>
  );
}

export function RoadsideScreen() {
  const params = useSearchParams();
  const initial = params.get("issue") as RoadsideIssue | null;
  const [issue, setIssue] = useState<RoadsideIssue | null>(initial && ROADSIDE[initial] ? (initial === "wont_start" ? "breakdown" : initial) : null);
  const { spot, status, locate } = useSpot();
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [mine, setMine] = useState<RoadsideRequestView[]>([]);

  const active = mine.filter((r) => r.role === "requester" && (r.status === "open" || r.status === "accepted") && !r.expired);
  const recentClosed = mine.filter((r) => r.role === "requester" && !active.includes(r)).slice(0, 1);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/roadside/requests?mine=1");
      const data = (await response.json()) as { requests?: RoadsideRequestView[] };
      if (Array.isArray(data.requests)) setMine(data.requests);
    } catch {
      /* keep the last view */
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  useEffect(() => {
    if (!active.length) return;
    const timer = setInterval(() => void refresh(), 8000);
    return () => clearInterval(timer);
  }, [active.length, refresh]);

  const where = spot ? mapsLink(spot.lat, spot.lng) : "";
  const smsBody = useMemo(
    () => `I need help${issue ? ` (${issueLabel(issue).toLowerCase()})` : ""}. My location: ${where || "location unavailable"}`,
    [issue, where],
  );
  const info = issue ? ROADSIDE[issue] : null;

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!issue) return setError("Pick what happened first.");
    if (!spot) return setError("Share your location so helpers can find you. Tap Retry location.");
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/roadside/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue, lat: spot.lat, lng: spot.lng, note, name, phone }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string; request?: RoadsideRequestView };
      if (!response.ok || !data.request) throw new Error(data.message || "Could not send the request.");
      setMine((current) => [data.request!, ...current]);
      setTimeout(() => document.getElementById("rh-status")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the request.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <header className="rounded-3xl bg-[#dc2626] px-5 py-5 text-white">
        <p className="text-xs font-bold tracking-wide uppercase">LifeSaver</p>
        <h1 className="font-serif text-4xl leading-none">Roadside Help</h1>
        <p className="mt-2 text-sm text-white/90">{ROADSIDE_SAFETY}</p>
        <div className="mt-3">
          <a href="tel:911" className="flex h-14 w-full items-center justify-center rounded-full bg-white text-lg font-bold text-[#dc2626]">📞 Call 911</a>
        </div>
      </header>

      {(active.length > 0 || recentClosed.length > 0) && (
        <div id="rh-status" className="space-y-2">
          {[...active, ...(active.length ? [] : recentClosed)].map((r) => (
            <StatusCard key={r.id} request={r} onChange={(next) => setMine((current) => current.map((c) => (c.id === next.id ? next : c)))} />
          ))}
        </div>
      )}

      <section aria-labelledby="rh-what">
        <h2 id="rh-what" className="font-serif text-2xl">What happened?</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PICKER_ISSUES.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={issue === id}
              onClick={() => {
                setIssue(id);
                setNote((current) => current || "");
              }}
              className={`flex min-h-16 items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left text-sm font-bold ${
                issue === id ? (id === "accident" ? "border-[#dc2626] bg-[#dc2626] text-white" : "border-ink bg-ink text-white") : "border-ink/10 bg-card"
              }`}
            >
              <span className="text-2xl" aria-hidden="true">{ISSUE_EMOJI[id]}</span>
              {ROADSIDE[id].label}
            </button>
          ))}
        </div>
      </section>

      {issue === "accident" && (
        <section className="space-y-2 rounded-3xl border-4 border-[#dc2626] bg-white p-4">
          <p className="font-serif text-2xl leading-tight text-[#dc2626]">Call 911 first if anyone is hurt or a car is blocking traffic.</p>
          <Call911 />
        </section>
      )}

      <section className="space-y-2 rounded-3xl border-2 border-ink/10 bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1 font-serif text-2xl"><MapPin className="size-5" aria-hidden="true" /> Your location</h2>
          <button type="button" onClick={locate} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-bold">
            <RefreshCw className="size-3.5" aria-hidden="true" /> Retry location
          </button>
        </div>
        {spot ? (
          <>
            <p className="font-mono text-sm">
              {spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}
              {spot.accuracy ? <span className="text-muted-foreground"> · ±{Math.round(spot.accuracy)} m</span> : null}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(`${spot.lat.toFixed(6)}, ${spot.lng.toFixed(6)} ${where}`).then(() => setCopied(true))}
                className="inline-flex h-11 items-center gap-1 rounded-full bg-ink px-4 text-sm font-bold text-white"
              >
                <Copy className="size-4" aria-hidden="true" /> {copied ? "Copied" : "Copy location"}
              </button>
              <a href={`sms:?&body=${encodeURIComponent(smsBody)}`} className="inline-flex h-11 items-center gap-1 rounded-full bg-lime px-4 text-sm font-bold text-ink">
                <MessageSquare className="size-4" aria-hidden="true" /> Text my location
              </a>
              <a href={where} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-full border-2 border-ink px-4 text-sm font-bold">Open map</a>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{status}</p>
        )}
      </section>

      {info && (
        <section className="rounded-3xl bg-sun/60 p-4 text-ink">
          <h2 className="font-serif text-2xl">{info.label}: stay safe</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {info.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-serif text-2xl">Get help now</h2>
        <div className="grid grid-cols-2 gap-2">
          {(issue ? HELP_LINKS[issue] : ["tow truck", "tire shop", "fuel delivery", "car locksmith"]).map((what) => (
            <a key={what} href={nearLink(what, spot)} target="_blank" rel="noreferrer" className="rounded-2xl bg-ink px-3 py-3 text-sm font-bold text-white">
              {what.charAt(0).toUpperCase() + what.slice(1)} near me →
            </a>
          ))}
        </div>
        <div className="rounded-2xl border bg-card p-3 text-sm">
          <p className="font-semibold">Call a tow</p>
          <p className="text-muted-foreground">Check your insurance card or app first. Many policies, car makers, and credit cards include free roadside help.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a href="tel:+18002224357" className="inline-flex h-10 items-center rounded-full bg-ink px-3 text-xs font-bold text-white">AAA members: 1-800-222-4357</a>
            <a href={nearLink("tow truck", spot)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full border-2 border-ink px-3 text-xs font-bold">
              Find a local tow and tap Call
            </a>
          </div>
        </div>
        {/* TODO(dispatch-partner): connect a professional roadside dispatch API (HONK, Motify, Urgently, or similar)
            here so a pro can be booked and tracked in-app. Until then, LifeSaver only links out and never claims a pro is coming. */}
      </section>

      {issue === "out_of_gas" && spot && (
        <section className="space-y-2">
          <h2 className="font-serif text-2xl">Nearest gas</h2>
          <NearbyGas lat={spot.lat} lng={spot.lng} />
        </section>
      )}

      <section className="space-y-3 rounded-3xl bg-ink p-4 text-white">
        <p className="text-xs font-bold tracking-wide text-lime uppercase">Lend a Hand</p>
        <h2 className="font-serif text-2xl leading-tight">Ask nearby Lend a Hand helpers</h2>
        <p className="text-sm text-white/80">
          {issue === "out_of_gas" ? "Ask a nearby helper to bring gas. " : ""}Helpers near you see what happened and your approximate area. Only the helper who accepts gets your exact spot and phone number.
        </p>
        <form className="space-y-2" onSubmit={ask}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="rh-name" className="text-xs font-semibold">First name</label>
              <input id="rh-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" className="h-12 w-full rounded-2xl px-3 text-base text-ink" />
            </div>
            <div>
              <label htmlFor="rh-phone" className="text-xs font-semibold">Phone</label>
              <input id="rh-phone" required type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className="h-12 w-full rounded-2xl px-3 text-base text-ink" />
            </div>
          </div>
          <div>
            <label htmlFor="rh-note" className="text-xs font-semibold">Note (where exactly, car, what you need)</label>
            <textarea
              id="rh-note"
              rows={2}
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={issue === "out_of_gas" ? "Silver Civic, westbound I-70 near exit 49. Could you bring a gallon of gas?" : "Silver Civic, westbound I-70 near exit 49, right shoulder."}
              className="w-full rounded-2xl px-3 py-2 text-base text-ink"
            />
          </div>
          {error && <p className="rounded-xl bg-white/15 px-3 py-2 text-sm" role="alert">{error}</p>}
          <button type="submit" disabled={sending || active.length >= 3} className="h-12 w-full rounded-full bg-lime text-base font-bold text-ink">
            {sending ? "Sending…" : "Ask nearby helpers"}
          </button>
        </form>
        <p className="text-xs text-white/70">{COMMUNITY_NOTE}</p>
        <Link href="/roadside/helpers" className="block text-sm font-semibold text-lime underline">Are you a helper? See requests near you</Link>
      </section>

      <Call911 />
      <Link href="/home" className="block text-center text-sm font-semibold text-primary">Back to LifeSaver</Link>
    </div>
  );
}
