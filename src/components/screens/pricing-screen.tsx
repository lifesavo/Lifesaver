"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  freeIncludes,
  FOUNDING_HAND_LABEL,
  FOUNDING_PREMIUM_LABEL,
  HAND_PRICE_LABEL,
  handIncludes,
  PREMIUM_PRICE_LABEL,
  premiumIncludes,
} from "@/lib/pricing";
import { useProfile, type Profile } from "@/lib/profile";

type Paid = "premium" | "hand";

function FeatureList({ items, tone }: { items: readonly { title: string; body: string; soon?: boolean }[]; tone: "light" | "dark" }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((feature) => (
        <li key={feature.title} className="flex gap-2 text-sm">
          {feature.soon ? (
            <Clock className={`mt-0.5 size-4 shrink-0 ${tone === "dark" ? "text-white/60" : "text-muted-foreground"}`} aria-hidden="true" />
          ) : (
            <Check className={`mt-0.5 size-4 shrink-0 ${tone === "dark" ? "text-lime" : "text-primary"}`} aria-hidden="true" />
          )}
          <span>
            <span className="font-semibold">{feature.title}. </span>
            {feature.body}
            {feature.soon ? (
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${tone === "dark" ? "bg-white/15" : "bg-muted"}`}>
                Coming soon
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PricingScreen({ billingOpen = false }: { billingOpen?: boolean }) {
  const { profile, setPlan, account, refreshAccount } = useProfile();
  const params = useSearchParams();
  const router = useRouter();
  const checkout = params.get("checkout");
  const [notice, setNotice] = useState<Profile["plan"] | null>(null);
  const [busy, setBusy] = useState<Paid | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (checkout === "success") void refreshAccount();
  }, [checkout, refreshAccount]);
  if (!profile) return null;
  const current = profile;

  async function choose(plan: Paid) {
    setError("");
    setBusy(plan);
    try {
      if (billingOpen) {
        if (!account) {
          router.push("/start?mode=signin");
          return;
        }
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, email: current.email, trial: plan === "premium" }),
        });
        const data = (await response.json()) as { ok?: boolean; url?: string; message?: string };
        if (!response.ok || !data.url) throw new Error(data.message || "Checkout didn't open. Try again.");
        window.location.href = data.url;
        return;
      }
      const response = await fetch("/api/billing/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email: current.email, zip: current.zip }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) throw new Error(data.message || "That didn't save. Try again.");
      setPlan(plan);
      setNotice(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const founding = billingOpen ? (account?.founding ?? true) : true;
  const premiumPrice = founding ? FOUNDING_PREMIUM_LABEL : PREMIUM_PRICE_LABEL;
  const handPrice = founding ? FOUNDING_HAND_LABEL : HAND_PRICE_LABEL;

  const lockedNote = (plan: Paid) =>
    billingOpen
      ? null
      : `Your ${plan === "premium" ? FOUNDING_PREMIUM_LABEL : FOUNDING_HAND_LABEL}/mo founding rate is saved to ${current.email}. Billing opens soon, and we will email you before anything is charged. Until then it's unlocked free.`;

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-gradient-to-br from-[#e01470] via-[#6d28d9] to-[#0891b2] px-5 py-7 text-white">
        <p className="text-xs font-bold tracking-[0.16em] uppercase text-lime">Two ways. Both full.</p>
        <h1 className="mt-3 font-serif text-[2.6rem] leading-[0.92] tracking-tight">
          Everything.
          <br />
          One price.
          <br />
          Or everything,
          <br />
          plus a person.
        </h1>
      </section>

      <div className="rounded-3xl bg-lime px-4 py-4 text-ink">
        <p className="font-serif text-2xl leading-tight">
          {billingOpen
            ? `Founding pricing: ${FOUNDING_PREMIUM_LABEL}/mo for life`
            : "Founding pricing. Billing opens soon. Lock in your rate now."}
        </p>
        <p className="mt-2 text-sm">
          Premium stays {FOUNDING_PREMIUM_LABEL}/mo for life instead of {PREMIUM_PRICE_LABEL}. Lend a Hand stays{" "}
          {FOUNDING_HAND_LABEL}/mo for life instead of {HAND_PRICE_LABEL}.{" "}
          {billingOpen
            ? "Cancel any time."
            : "No card needed today. We'll email you before billing starts, and you can say no."}
        </p>
      </div>

      {checkout === "success" ? (
        <p className="rounded-2xl bg-lime px-4 py-3 text-sm font-medium text-ink" role="status">
          Thanks! If you started a trial, nothing is charged today. Your plan can take a few seconds to show here. Cancel in Settings under Manage billing before the trial ends if you don&apos;t want to be charged.
        </p>
      ) : null}
      {checkout === "canceled" ? (
        <p className="rounded-2xl bg-secondary px-4 py-3 text-sm" role="status">
          Checkout canceled. Nothing was charged.
        </p>
      ) : null}
      {billingOpen && !account ? (
        <p className="rounded-2xl bg-sun/40 px-4 py-3 text-sm" role="status">
          Sign in to your LifeSaver account to pick a plan.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <article className="rounded-3xl border-2 border-ink/10 bg-card p-4">
        <p className="text-xs font-bold tracking-wide text-primary uppercase">Premium</p>
        <p className="font-serif text-4xl">
          {FOUNDING_PREMIUM_LABEL}
          <span className="text-lg text-muted-foreground">/mo for life</span>
        </p>
        <p className="text-sm text-muted-foreground">Founding rate. Regular price {PREMIUM_PRICE_LABEL}/mo.</p>
        {billingOpen ? (
          <p className="mt-2 text-sm text-muted-foreground">
            7 days free, then {premiumPrice}/month. Cancel anytime before your trial ends and you won&apos;t be charged.
            You can cancel in Settings under Manage billing.
          </p>
        ) : null}
        <FeatureList items={premiumIncludes} tone="light" />
        {current.plan === "premium" ? (
          <p className="mt-4 rounded-2xl bg-secondary px-3 py-2 text-sm" role="status">
            {billingOpen ? "You're on Premium." : lockedNote("premium")}
          </p>
        ) : (
          <Button
            type="button"
            className="mt-4 h-12 w-full rounded-full"
            disabled={busy !== null}
            onClick={() => choose("premium")}
          >
            {busy === "premium"
              ? "Saving…"
              : billingOpen
                ? `Try Premium free for 7 days`
                : `Lock in ${FOUNDING_PREMIUM_LABEL}/mo for life`}
          </Button>
        )}
      </article>

      <article className="rounded-3xl bg-ink p-4 text-white">
        <p className="text-xs font-bold tracking-wide text-lime uppercase">Lend a Hand</p>
        <p className="font-serif text-4xl">
          {FOUNDING_HAND_LABEL}
          <span className="text-lg text-white/70">/mo for life</span>
        </p>
        <p className="text-sm text-white/75">
          Founding rate. Regular price {HAND_PRICE_LABEL}/mo. Everything in Premium, plus help from
          people nearby. Helping others is included, so you can earn too.
        </p>
        <FeatureList items={handIncludes} tone="dark" />
        {current.plan === "hand" ? (
          <p className="mt-4 rounded-2xl bg-white/10 px-3 py-2 text-sm" role="status">
            {billingOpen ? "You're on Lend a Hand." : lockedNote("hand")}
          </p>
        ) : (
          <Button
            type="button"
            className="mt-4 h-12 w-full rounded-full bg-lime font-bold text-ink hover:bg-lime/90"
            disabled={busy !== null}
            onClick={() => choose("hand")}
          >
            {busy === "hand"
              ? "Saving…"
              : billingOpen
                ? `Start Lend a Hand at ${handPrice}/mo`
                : `Lock in ${FOUNDING_HAND_LABEL}/mo for life`}
          </Button>
        )}
        <Button asChild variant="ghost" className="mt-2 h-11 w-full rounded-full text-white hover:bg-white/10 hover:text-white">
          <Link href="/help">See how Get a Hand works</Link>
        </Button>
      </article>

      {notice && notice !== "free" && (
        <p className="rounded-2xl bg-lime px-4 py-3 text-sm font-medium text-ink" role="status">
          Locked in. {notice === "premium" ? `Premium at ${FOUNDING_PREMIUM_LABEL}` : `Lend a Hand at ${FOUNDING_HAND_LABEL}`}/mo for life
          is saved. Billing opens soon, and nothing is charged until you say yes.
        </p>
      )}

      <section className="rounded-3xl border border-dashed p-4">
        <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Free</p>
        <h2 className="font-serif text-2xl">Free forever.</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {freeIncludes.map((feature) => (
            <li key={feature.title}>
              <span className="font-semibold text-foreground">{feature.title}. </span>
              {feature.body}
            </li>
          ))}
        </ul>
        {current.plan !== "free" && !billingOpen && (
          <Button type="button" variant="outline" className="mt-3 h-11 rounded-full" onClick={() => setPlan("free")}>
            Switch back to Free
          </Button>
        )}
      </section>
    </div>
  );
}
