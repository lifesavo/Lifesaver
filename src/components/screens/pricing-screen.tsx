"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { DemoNote } from "@/components/demo-note";
import { Button } from "@/components/ui/button";
import {
  freeIncludes,
  FOUNDING_HAND_LABEL,
  FOUNDING_PREMIUM_LABEL,
  HAND_PRICE_LABEL,
  handIncludes,
  HELPER_PRICE_LABEL,
  helperIncludes,
  PREMIUM_PRICE_LABEL,
  premiumIncludes,
} from "@/lib/pricing";
import { useProfile, type Profile } from "@/lib/profile";

export function PricingScreen() {
  const { profile, setPlan, reset } = useProfile();
  const [notice, setNotice] = useState<Profile["plan"] | null>(null);
  if (!profile) return null;

  function choose(plan: Profile["plan"]) {
    setPlan(plan);
    setNotice(plan);
  }

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

      <Link href="/#waitlist" className="block rounded-3xl bg-lime px-4 py-4 text-ink">
        <p className="font-serif text-2xl leading-tight">
          Founding Member: {FOUNDING_PREMIUM_LABEL}/mo for life — join the waitlist now
        </p>
        <p className="mt-2 text-sm">
          Premium stays {FOUNDING_PREMIUM_LABEL}/mo instead of {PREMIUM_PRICE_LABEL}. Lend a Hand stays{" "}
          {FOUNDING_HAND_LABEL}/mo instead of {HAND_PRICE_LABEL}. After launch, new members pay the regular rates.
        </p>
      </Link>

      <DemoNote>
        Billing is mocked. Picking a plan does not charge a card. After launch, Stripe bills {PREMIUM_PRICE_LABEL} or {HAND_PRICE_LABEL} a month. Founding members stay at {FOUNDING_PREMIUM_LABEL} and {FOUNDING_HAND_LABEL}.
      </DemoNote>

      <article className="rounded-3xl border-2 border-ink/10 bg-card p-4">
        <p className="text-xs font-bold tracking-wide text-primary uppercase">Premium</p>
        <p className="font-serif text-4xl">{FOUNDING_PREMIUM_LABEL}<span className="text-lg text-muted-foreground">/mo for life</span></p>
        <p className="text-sm text-muted-foreground">Waitlist lock. After launch: {PREMIUM_PRICE_LABEL}/mo. The whole money app.</p>
        <ul className="mt-3 space-y-2">
          {premiumIncludes.map((feature) => (
            <li key={feature.title} className="flex gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="font-semibold">{feature.title}. </span>
                {feature.body}
              </span>
            </li>
          ))}
        </ul>
        {profile.plan === "premium" ? (
          <p className="mt-4 rounded-2xl bg-secondary px-3 py-2 text-sm" role="status">
            Premium is on in this demo.
          </p>
        ) : (
          <Button type="button" className="mt-4 h-12 w-full rounded-full" onClick={() => choose("premium")}>
            Get everything for {PREMIUM_PRICE_LABEL}
          </Button>
        )}
      </article>

      <article className="rounded-3xl bg-ink p-4 text-white">
        <p className="text-xs font-bold tracking-wide text-lime uppercase">Lend a Hand</p>
        <p className="font-serif text-4xl">{FOUNDING_HAND_LABEL}<span className="text-lg text-white/70">/mo for life</span></p>
        <p className="text-sm text-white/75">Waitlist lock. After launch: {HAND_PRICE_LABEL}/mo. Everything in Premium, plus helpers.</p>
        <ul className="mt-3 space-y-2">
          {handIncludes.map((feature) => (
            <li key={feature.title} className="flex gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden="true" />
              <span>
                <span className="font-semibold">{feature.title}. </span>
                {feature.body}
              </span>
            </li>
          ))}
        </ul>
        {profile.plan === "hand" ? (
          <p className="mt-4 rounded-2xl bg-white/10 px-3 py-2 text-sm" role="status">
            Lend a Hand is on. Helpers, plus every Premium feature. No card charged.
          </p>
        ) : (
          <Button
            type="button"
            className="mt-4 h-12 w-full rounded-full bg-lime font-bold text-ink hover:bg-lime/90"
            onClick={() => choose("hand")}
          >
            Add helpers for {FOUNDING_HAND_LABEL} for life
          </Button>
        )}
        <Button asChild variant="ghost" className="mt-2 h-11 w-full rounded-full text-white hover:bg-white/10 hover:text-white">
          <Link href="/hand">See the helper flow</Link>
        </Button>
      </article>

      <article id="helper" className="rounded-3xl bg-gradient-to-br from-[#ff7a18] via-[#e01470] to-[#6d28d9] p-4 text-white">
        <p className="text-xs font-bold tracking-wide text-lime uppercase">Helper · Earn money</p>
        <p className="font-serif text-4xl">{HELPER_PRICE_LABEL}<span className="text-lg text-white/75">/mo</span></p>
        <p className="text-sm text-white/85">For people who want to get paid helping others. Accepting Lend a Hand and roadside requests needs an active Helper plan.</p>
        <ul className="mt-3 space-y-2">
          {helperIncludes.map((feature) => (
            <li key={feature.title} className="flex gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden="true" />
              <span>
                <span className="font-semibold">{feature.title}. </span>
                {feature.body}
              </span>
            </li>
          ))}
        </ul>
        <Button asChild className="mt-4 h-12 w-full rounded-full bg-lime font-bold text-ink hover:bg-lime/90">
          <Link href="/#waitlist">Join the Helper waitlist</Link>
        </Button>
        <p className="mt-2 text-xs text-white/75">Not live yet. Joining the waitlist does not charge a card.</p>
      </article>

      {notice === "premium" && (
        <p className="rounded-2xl bg-secondary px-4 py-3 text-sm" role="status">
          Premium is on in this demo. Auto-cancel, negotiation, alerts, deals, and goals. No charge.
        </p>
      )}
      {notice === "hand" && (
        <p className="rounded-2xl bg-lime px-4 py-3 text-sm font-medium text-ink" role="status">
          Lend a Hand is on. You have Premium, plus posting, offers, and booking. No charge.
        </p>
      )}

      <section className="rounded-3xl border border-dashed p-4">
        <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Free on-ramp</p>
        <h2 className="font-serif text-2xl">Enough to see the leaks.</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {freeIncludes.map((feature) => (
            <li key={feature.title}>
              <span className="font-semibold text-foreground">{feature.title}. </span>
              {feature.body}
            </li>
          ))}
        </ul>
        {profile.plan !== "free" && (
          <Button type="button" variant="outline" className="mt-3 h-11 rounded-full" onClick={() => choose("free")}>
            Back to the free on-ramp
          </Button>
        )}
      </section>

      <Button type="button" variant="ghost" className="h-11 w-full rounded-full" onClick={() => reset()}>
        Reset this demo
      </Button>
    </div>
  );
}
