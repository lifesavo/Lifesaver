"use client";

import Link from "next/link";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { foundingShareMessage } from "@/lib/pricing";

const ATTRIBUTION_KEY = "lifesaver.attribution";

type AttributionFields = {
  ref: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
};

type Success = {
  already: boolean;
  count: number;
  email: string;
  source: string;
  founding: boolean;
  shareCode: string;
  foundingPremium: string;
  foundingHand: string;
  regularPremium: string;
  regularHand: string;
};

function readStoredAttribution() {
  const params = new URLSearchParams(window.location.search);
  const incoming: AttributionFields = {
    ref: params.get("ref") ?? "",
    utm_source: params.get("utm_source") ?? "",
    utm_medium: params.get("utm_medium") ?? "",
    utm_campaign: params.get("utm_campaign") ?? "",
  };
  if (Object.values(incoming).some((value) => value.trim())) {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(incoming));
  }
  return sessionStorage.getItem(ATTRIBUTION_KEY) ?? "";
}

export function WaitlistForm({ idPrefix = "waitlist" }: { idPrefix?: string }) {
  const emailId = useId();
  const zipId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [company, setCompany] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [countError, setCountError] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState<Success | null>(null);
  const storedAttribution = useSyncExternalStore(
    () => () => {},
    readStoredAttribution,
    () => "",
  );
  let attribution: AttributionFields = {
    ref: "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
  };
  if (storedAttribution) {
    try {
      attribution = JSON.parse(storedAttribution) as AttributionFields;
    } catch {
      attribution = { ref: "", utm_source: "", utm_medium: "", utm_campaign: "" };
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/waitlist")
      .then(async (response) => {
        if (!response.ok) throw new Error("count");
        return (await response.json()) as { count: number };
      })
      .then((data) => {
        if (!cancelled) setCount(data.count);
      })
      .catch(() => {
        if (!cancelled) setCountError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, zip, company, ...attribution }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        already?: boolean;
        count?: number;
        email?: string;
        utmSource?: string | null;
        founding?: boolean;
        shareCode?: string;
        foundingPremium?: string;
        foundingHand?: string;
        regularPremium?: string;
        regularHand?: string;
      };
      if (!response.ok || !data.ok) {
        setError(data.message || "We couldn't save that. Try again.");
        return;
      }
      setSuccess({
        already: Boolean(data.already),
        count: data.count ?? count ?? 1,
        email: data.email || email.trim().toLowerCase(),
        source: data.utmSource || attribution.utm_source,
        founding: Boolean(data.founding),
        shareCode: data.shareCode || "",
        foundingPremium: data.foundingPremium || "$7.99",
        foundingHand: data.foundingHand || "$20.00",
        regularPremium: data.regularPremium || "$9.99",
        regularHand: data.regularHand || "$25.99",
      });
      if (typeof data.count === "number") setCount(data.count);
    } catch {
      setError("We couldn't reach the waitlist. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-3xl bg-primary px-5 py-6 text-primary-foreground" role="status">
        <p className="font-serif text-3xl leading-tight">
          {success.already ? "You're already on the list." : "You're on the list."}
        </p>
        <p className="mt-3 text-sm leading-6 text-primary-foreground/85">
          {success.email ? (
            <>
              We saved <span className="font-semibold">{success.email}</span> in this app&apos;s
              database.
            </>
          ) : (
            "We saved your note."
          )}{" "}
          {success.count === 1
            ? "You're the first one here."
            : `${success.count} people are waiting with you.`}
          {success.source ? ` Tagged from ${success.source}.` : ""}
        </p>
        <Link
          href="/giveaway"
          className="mt-3 block rounded-2xl bg-white/20 px-3 py-2 text-sm font-semibold"
        >
          🎁 Now enter this week&apos;s free $100 giveaway →
        </Link>
        {success.founding && success.shareCode && (
          <div className="mt-4 rounded-2xl bg-white/15 p-3 text-sm leading-6">
            <p className="font-semibold">Founding Member rate, locked for life</p>
            <p>
              Premium {success.foundingPremium}/mo (after launch {success.regularPremium}). Lend a Hand{" "}
              {success.foundingHand}/mo (after launch {success.regularHand}).
            </p>
            <p className="mt-2 break-words text-primary-foreground/90">
              {foundingShareMessage(window.location.origin, success.shareCode)}
            </p>
            <button
              type="button"
              className="mt-3 h-11 rounded-full bg-lime px-4 text-sm font-bold text-ink"
              onClick={() => {
                const message = foundingShareMessage(window.location.origin, success.shareCode);
                void navigator.clipboard.writeText(message).then(() => setCopied(true));
              }}
            >
              {copied ? "Share message copied" : "Copy referral share message"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border bg-card p-5 shadow-sm" noValidate>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-3xl tracking-tight">Put me on the list</h2>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {count === null && !countError && "Checking the list…"}
          {count === 0 && "Be the first."}
          {typeof count === "number" && count > 0 && `${count} waiting`}
          {countError && count === null && "List is local"}
        </p>
      </div>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        We save this on the server. It sticks after a refresh.
      </p>
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${emailId}`}>Email</Label>
          <Input
            id={`${idPrefix}-${emailId}`}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-12 rounded-2xl bg-background px-4 text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${zipId}`}>ZIP code, optional</Label>
          <Input
            id={`${idPrefix}-${zipId}`}
            name="zip"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            value={zip}
            onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="94110"
            className="h-12 rounded-2xl bg-background px-4 text-base"
          />
        </div>
        <div className="absolute -left-[9999px] h-0 overflow-hidden" aria-hidden="true">
          <label>
            Company
            <input
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </label>
        </div>
        {error && (
          <p id={errorId} className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {attribution.utm_source && (
          <p className="inline-block -rotate-1 rounded-full bg-lime px-3 py-1 text-xs font-bold text-ink">
            via {attribution.utm_source}
            {attribution.ref ? ` · ref ${attribution.ref}` : ""}
          </p>
        )}
        <Button type="submit" disabled={pending} className="h-14 w-full rounded-full bg-lime text-lg font-bold text-ink shadow-[4px_4px_0_#2a1038]">
          {pending ? "Saving…" : "Get the drop"}
        </Button>
      </div>
    </form>
  );
}
