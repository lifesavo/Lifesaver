"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BellPlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FetchDisclaimer, FetchHowItWorks, FetchPrompt, FetchStoreLinks, OpenFetchButton } from "@/components/fetch-prompt";
import { money } from "@/lib/money";
import {
  RECEIPTS_EVENT,
  addReceiptTrip,
  downloadWeeklyScanReminder,
  fetchReferralCode,
  readReceipts,
  receiptTotals,
  removeReceiptTrip,
  updateReceiptTrip,
  type ReceiptTrip,
} from "@/lib/receipts";
import { FETCH_REFERRAL_INFO } from "@/lib/receipts";

function dayLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function toPoints(text: string) {
  const n = Number(text.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function toMoney(text: string) {
  const n = Number(text.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : 0;
}

export function ReceiptsScreen() {
  const [trips, setTrips] = useState<ReceiptTrip[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState("");
  const [store, setStore] = useState("");
  const [note, setNote] = useState("");
  const [points, setPoints] = useState("");
  const [value, setValue] = useState("");
  const [scanned, setScanned] = useState(false);
  const [reminded, setReminded] = useState(false);
  const [editPoints, setEditPoints] = useState<Record<string, string>>({});
  const [editValue, setEditValue] = useState<Record<string, string>>({});
  const referral = fetchReferralCode();

  useEffect(() => {
    const refresh = () => setTrips(readReceipts().trips);
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    // Load once on the client; localStorage is not available during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(key);
    refresh();
    setLoaded(true);
    const listener: EventListener = () => refresh();
    window.addEventListener(RECEIPTS_EVENT, listener);
    window.addEventListener("storage", listener);
    return () => {
      window.removeEventListener(RECEIPTS_EVENT, listener);
      window.removeEventListener("storage", listener);
    };
  }, []);

  const totals = useMemo(() => receiptTotals(trips), [trips]);
  const pending = trips.filter((t) => !t.scanned);
  const done = trips.filter((t) => t.scanned);

  function addTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    const pts = toPoints(points);
    const dollars = toMoney(value);
    addReceiptTrip({
      date,
      store,
      note,
      source: "manual",
      scanned: scanned || pts > 0 || dollars > 0,
      points: pts,
      value: dollars,
    });
    setStore("");
    setNote("");
    setPoints("");
    setValue("");
    setScanned(false);
    setTrips(readReceipts().trips);
  }

  function saveRewards(trip: ReceiptTrip) {
    const pts = toPoints(editPoints[trip.id] ?? String(trip.points || ""));
    const dollars = toMoney(editValue[trip.id] ?? String(trip.value || ""));
    updateReceiptTrip(trip.id, { points: pts, value: dollars, scanned: true });
    setEditPoints((prev) => {
      const next = { ...prev };
      delete next[trip.id];
      return next;
    });
    setEditValue((prev) => {
      const next = { ...prev };
      delete next[trip.id];
      return next;
    });
    setTrips(readReceipts().trips);
  }

  function renderTrip(trip: ReceiptTrip) {
    return (
      <li key={trip.id} className="space-y-2 border-b px-4 py-3 last:border-b-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">
              {trip.store || "Shopping trip"}
              {trip.scanned ? (
                <span className="ml-2 text-xs font-semibold text-primary">Snapped</span>
              ) : (
                <span className="ml-2 text-xs font-semibold text-muted-foreground">Not yet scanned</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {dayLabel(trip.date)}
              {trip.note ? ` · ${trip.note}` : ""}
            </p>
            {(trip.points > 0 || trip.value > 0) && (
              <p className="mt-1 text-sm tabular-nums">
                {trip.points > 0 ? `${trip.points.toLocaleString()} points` : ""}
                {trip.points > 0 && trip.value > 0 ? " · " : ""}
                {trip.value > 0 ? money(trip.value) : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground"
            aria-label={`Remove ${trip.store || "trip"} on ${dayLabel(trip.date)}`}
            onClick={() => {
              removeReceiptTrip(trip.id);
              setTrips(readReceipts().trips);
            }}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-[11px] font-semibold">
            Fetch points
            <Input
              inputMode="numeric"
              placeholder="0"
              value={editPoints[trip.id] ?? (trip.points ? String(trip.points) : "")}
              onChange={(e) => setEditPoints((prev) => ({ ...prev, [trip.id]: e.target.value }))}
              className="mt-1 h-9 w-24 rounded-xl"
            />
          </label>
          <label className="block text-[11px] font-semibold">
            Dollar value (optional)
            <Input
              inputMode="decimal"
              placeholder="$0.00"
              value={editValue[trip.id] ?? (trip.value ? String(trip.value) : "")}
              onChange={(e) => setEditValue((prev) => ({ ...prev, [trip.id]: e.target.value }))}
              className="mt-1 h-9 w-28 rounded-xl"
            />
          </label>
          <Button type="button" className="h-9 rounded-full px-3" onClick={() => saveRewards(trip)}>
            Save rewards
          </Button>
          {!trip.scanned && (
            <Button
              type="button"
              variant="secondary"
              className="h-9 rounded-full px-3"
              onClick={() => {
                updateReceiptTrip(trip.id, { scanned: true });
                setTrips(readReceipts().trips);
              }}
            >
              Mark scanned
            </Button>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold tracking-wide text-primary uppercase">New · Free</p>
        <h1 className="font-serif text-3xl tracking-tight">Receipts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          After a grocery run or a purchase, log the trip here, snap the receipt in Fetch for points, and keep a running
          total of rewards you record. Everything stays on this phone. LifeSaver does not connect to Fetch.
        </p>
      </header>

      <section className="rounded-3xl bg-lime px-4 py-5 text-ink">
        <p className="text-xs font-bold tracking-wide uppercase">Rewards you&apos;ve logged</p>
        <p className="mt-1 font-serif text-4xl tracking-tight tabular-nums">{totals.points.toLocaleString()}</p>
        <p className="text-sm">Fetch points typed in by you</p>
        <p className="mt-3 text-sm leading-6">
          {totals.value > 0 ? (
            <>
              Plus {money(totals.value)} in dollar amounts you entered, for example after redeeming a gift card. We
              don&apos;t convert points to dollars for you.
            </>
          ) : (
            <>We don&apos;t convert points to dollars unless you type a dollar amount, for example after you redeem a reward.</>
          )}
        </p>
        <p className="mt-2 text-sm">
          {totals.pending === 0
            ? totals.count === 0
              ? "No trips logged yet."
              : `${totals.scanned} receipt${totals.scanned === 1 ? "" : "s"} marked scanned.`
            : `${totals.pending} receipt${totals.pending === 1 ? "" : "s"} not yet scanned.`}
        </p>
      </section>

      {loaded && pending.length > 0 && (
        <p className="rounded-3xl bg-sun px-4 py-3 text-sm leading-6 text-ink" role="status">
          You have {pending.length} receipt{pending.length === 1 ? "" : "s"} not yet scanned in Fetch. Fetch says
          physical receipts must be snapped within 14 days of the checkout date.
        </p>
      )}

      <FetchPrompt
        title="Snap this receipt in Fetch for points"
        detail="Open Fetch, snap the paper receipt or use eReceipts in that app, then come back here and type the points you earned so your LifeSaver totals stay up to date."
      />

      <div className="flex flex-wrap gap-2">
        <OpenFetchButton />
        <Button
          type="button"
          variant="secondary"
          className="h-11 rounded-full px-5"
          onClick={() => {
            downloadWeeklyScanReminder();
            setReminded(true);
          }}
        >
          <BellPlus className="size-4" aria-hidden="true" />
          {reminded ? "Reminder downloaded" : "Weekly calendar reminder"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        The reminder is a calendar file that repeats every Sunday, so you can catch receipts before Fetch&apos;s 14-day
        window closes. Add it to your phone&apos;s calendar if you want the alert there.
      </p>

      <form onSubmit={addTrip} className="space-y-3 rounded-3xl border bg-card px-4 py-4">
        <h2 className="font-serif text-2xl tracking-tight">Log a trip</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-semibold">
            Date
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="mt-1 h-11 rounded-2xl" />
          </label>
          <label className="block text-xs font-semibold">
            Store (optional)
            <Input
              value={store}
              onChange={(e) => setStore(e.target.value)}
              placeholder="Where you shopped"
              maxLength={60}
              className="mt-1 h-11 rounded-2xl"
            />
          </label>
        </div>
        <label className="block text-xs font-semibold">
          Note (optional)
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Groceries, dinner, gas…"
            maxLength={120}
            className="mt-1 h-11 rounded-2xl"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-semibold">
            Fetch points (if you already snapped it)
            <Input
              inputMode="numeric"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="0"
              className="mt-1 h-11 rounded-2xl"
            />
          </label>
          <label className="block text-xs font-semibold">
            Dollar value (optional)
            <Input
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="$0.00"
              className="mt-1 h-11 rounded-2xl"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={scanned} onChange={(e) => setScanned(e.target.checked)} className="size-4" />
          I already snapped this receipt in Fetch
        </label>
        <Button type="submit" className="h-11 rounded-full px-5" disabled={!loaded || !date}>
          <Plus className="size-4" aria-hidden="true" /> Log trip
        </Button>
      </form>

      {pending.length > 0 && (
        <section aria-labelledby="pending-heading" className="space-y-2">
          <h2 id="pending-heading" className="font-serif text-2xl tracking-tight">
            Not yet scanned <span className="text-base text-muted-foreground">({pending.length})</span>
          </h2>
          <ul className="overflow-hidden rounded-2xl border bg-card">{pending.map(renderTrip)}</ul>
        </section>
      )}

      {done.length > 0 && (
        <section aria-labelledby="done-heading" className="space-y-2">
          <h2 id="done-heading" className="font-serif text-2xl tracking-tight">
            Scanned <span className="text-base text-muted-foreground">({done.length})</span>
          </h2>
          <ul className="overflow-hidden rounded-2xl border bg-card">{done.map(renderTrip)}</ul>
        </section>
      )}

      <FetchHowItWorks />

      <section aria-labelledby="referral-heading" className="space-y-2 rounded-3xl border bg-card px-4 py-4">
        <h2 id="referral-heading" className="font-serif text-2xl tracking-tight">
          Fetch referral code
        </h2>
        {referral ? (
          <>
            <p className="text-sm leading-6">
              If you&apos;re new to Fetch, you can enter this code in the Fetch app before you snap your first receipt.
              Fetch typically gives bonus points to both people when the first receipt is snapped. Current bonuses are
              set by Fetch and can change.
            </p>
            <p className="rounded-2xl bg-secondary px-4 py-3 text-center font-mono text-xl font-bold tracking-wide">
              {referral}
            </p>
          </>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            A LifeSaver Fetch referral code will show up here if we add one later. We don&apos;t invent a code. You can
            still enter a friend&apos;s code in the Fetch app before you snap your first receipt. See{" "}
            <a href={FETCH_REFERRAL_INFO} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline">
              how Fetch referrals work
            </a>
            .
          </p>
        )}
      </section>

      <p className="text-sm leading-6 text-muted-foreground">
        Your trips and points are saved on this phone only. Shop from your{" "}
        <Link href="/grocery" className="font-semibold text-foreground underline">
          Grocery list
        </Link>
        , then come back to log the receipt. <FetchStoreLinks className="mt-1 text-sm" />
      </p>
      <FetchDisclaimer />
    </div>
  );
}
