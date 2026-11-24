"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/money";
import {
  FETCH_APP_STORE,
  FETCH_FAQ,
  FETCH_PLAY_STORE,
  FETCH_SITE,
  RECEIPTS_EVENT,
  RECEIPTS_KEY,
  officialFetchOpenUrl,
  parseReceipts,
  receiptTotals,
} from "@/lib/receipts";

export const FETCH_DISCLAIMER =
  "Fetch is a trademark of Fetch Rewards, LLC. LifeSaver isn't affiliated with or endorsed by Fetch.";

export function FetchDisclaimer({ className = "text-[11px] leading-4 text-muted-foreground" }: { className?: string }) {
  return <p className={className}>{FETCH_DISCLAIMER}</p>;
}

export function OpenFetchButton({ label = "Open Fetch", className }: { label?: string; className?: string }) {
  const [href, setHref] = useState(FETCH_SITE);
  useEffect(() => {
    // Pick the official store listing on phones after mount so SSR stays stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHref(officialFetchOpenUrl());
  }, []);

  return (
    <Button asChild className={className ?? "h-11 rounded-full px-5"}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        {label} <ExternalLink className="size-4" aria-hidden="true" />
      </a>
    </Button>
  );
}

export function FetchStoreLinks({ className = "text-sm" }: { className?: string }) {
  return (
    <p className={className}>
      <a href={FETCH_SITE} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
        Fetch&apos;s website
      </a>
      {" · "}
      <a href={FETCH_APP_STORE} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
        App Store
      </a>
      {" · "}
      <a href={FETCH_PLAY_STORE} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
        Google Play
      </a>
    </p>
  );
}

type PromptProps = {
  title?: string;
  detail?: string;
  logged?: boolean;
  onLogTrip?: () => void;
  logLabel?: string;
};

export function FetchPrompt({
  title = "Snap this receipt in Fetch for points",
  detail,
  logged,
  onLogTrip,
  logLabel = "Log this trip",
}: PromptProps) {
  return (
    <section className="space-y-3 rounded-3xl bg-ink px-4 py-4 text-white">
      <div>
        <p className="text-xs font-bold tracking-wide text-lime uppercase">Receipts</p>
        <h2 className="mt-1 font-serif text-2xl leading-tight tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/85">
          {detail ||
            "Fetch is a separate, free app where you snap receipts to earn points toward gift cards. LifeSaver isn't connected to your Fetch account, and Fetch doesn't publish a link that opens the scanner directly, so this takes you to Fetch's official site or app listing."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <OpenFetchButton label="Open Fetch to snap it" className="h-11 rounded-full bg-lime px-5 text-ink hover:bg-lime/90" />
        {onLogTrip && (
          <Button
            type="button"
            variant="secondary"
            className="h-11 rounded-full px-5"
            onClick={onLogTrip}
            disabled={logged}
          >
            {logged ? "Trip logged" : logLabel}
          </Button>
        )}
        <Button asChild variant="secondary" className="h-11 rounded-full px-5">
          <Link href="/receipts">Receipt tracker</Link>
        </Button>
      </div>
      <FetchStoreLinks className="text-xs text-white/75" />
      <FetchDisclaimer className="text-[11px] leading-4 text-white/55" />
    </section>
  );
}

export function FetchHowItWorks() {
  return (
    <section aria-labelledby="fetch-how-heading" className="space-y-2 rounded-3xl border bg-card px-4 py-4">
      <h2 id="fetch-how-heading" className="font-serif text-2xl tracking-tight">
        How Fetch works
      </h2>
      <p className="text-sm leading-6 text-muted-foreground">
        This is a short summary of what Fetch publishes on its own site. For the full, current rules, read{" "}
        <a href={FETCH_FAQ} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline">
          Fetch&apos;s FAQ
        </a>
        .
      </p>
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6">
        <li>Snap grocery, shopping, and restaurant receipts in the Fetch app to earn points you can redeem for gift cards and other rewards.</li>
        <li>You can snap up to 35 receipts in a 7-day rolling period.</li>
        <li>Physical receipts must be snapped within 14 days of the checkout date on them.</li>
        <li>Fetch is free, available in the United States, and does not ask for a credit card to sign up.</li>
        <li>
          If someone shares a referral code with you, enter it in Fetch before you snap your first receipt so you can both
          get bonus points.
        </li>
      </ul>
    </section>
  );
}

function subscribeReceipts(cb: () => void) {
  const listener: EventListener = () => cb();
  window.addEventListener(RECEIPTS_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(RECEIPTS_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function receiptsSnapshot() {
  try {
    return localStorage.getItem(RECEIPTS_KEY) ?? "";
  } catch {
    return "";
  }
}

function receiptsServerSnapshot() {
  return "";
}

function useReceiptTotals() {
  const raw = useSyncExternalStore(subscribeReceipts, receiptsSnapshot, receiptsServerSnapshot);
  const trips = useMemo(() => parseReceipts(raw).trips, [raw]);
  const loaded = typeof window !== "undefined";
  return { loaded, totals: receiptTotals(trips) };
}

export function ReceiptsHomeCard() {
  const { loaded, totals } = useReceiptTotals();
  return (
    <>
      {loaded && totals.pending > 0 && (
        <Link href="/receipts" className="block rounded-3xl bg-sun px-4 py-3 text-sm leading-6 text-ink">
          <span className="font-semibold">
            {totals.pending} receipt{totals.pending === 1 ? "" : "s"} not yet scanned in Fetch.
          </span>{" "}
          Snap them in the Fetch app, then type the points you earned so they count in your totals.
        </Link>
      )}
      <Link href="/receipts" className="flex items-center gap-3 rounded-3xl bg-[#fde68a] px-4 py-4 text-ink">
        <span className="text-4xl" aria-hidden="true">📸</span>
        <span>
          <span className="block text-xs font-bold tracking-wide uppercase">New · Free</span>
          <span className="block font-serif text-2xl leading-tight">Receipts</span>
          <span className="block text-sm">
            Snap receipts in Fetch for points, and keep a running total of rewards you log.
            {loaded && totals.points > 0 ? ` You've logged ${totals.points.toLocaleString()} points.` : ""}
          </span>
        </span>
      </Link>
    </>
  );
}

export function ReceiptsSavingsCard() {
  const { loaded, totals } = useReceiptTotals();
  if (!loaded || totals.count === 0) return null;
  return (
    <Link href="/receipts" className="block rounded-3xl border bg-card px-4 py-4">
      <p className="text-xs font-bold tracking-wide text-primary uppercase">Receipt rewards you logged</p>
      <p className="mt-1 font-serif text-3xl tracking-tight tabular-nums">{totals.points.toLocaleString()} points</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {totals.value > 0
          ? `Plus ${money(totals.value)} in dollar amounts you typed in. These are numbers you entered, not a live Fetch balance.`
          : "These are points you typed in after snapping a receipt in Fetch, not a live Fetch balance."}
        {totals.pending > 0
          ? ` ${totals.pending} receipt${totals.pending === 1 ? "" : "s"} still waiting to be scanned.`
          : ""}
      </p>
    </Link>
  );
}
