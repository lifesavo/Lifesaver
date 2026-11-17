"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { DemoNote } from "@/components/demo-note";
import { Button } from "@/components/ui/button";
import { freeIncludes, PREMIUM_PRICE_LABEL, premiumIncludes } from "@/lib/pricing";
import { useProfile } from "@/lib/profile";

export function PricingScreen() {
  const { profile, setPlan, reset } = useProfile();
  const [justUpgraded, setJustUpgraded] = useState(false);
  if (!profile) return null;
  const premium = profile.plan === "premium";

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-primary px-5 py-7 text-primary-foreground">
        <p className="text-xs font-semibold tracking-[0.16em] uppercase text-primary-foreground/75">
          Premium · the whole product
        </p>
        <h1 className="mt-3 font-serif text-[2.7rem] leading-[0.92] tracking-tight">
          Everything.
          <br />
          One price.
          <br />
          {PREMIUM_PRICE_LABEL}.
        </h1>
        <p className="mt-4 text-sm leading-6 text-primary-foreground/85">
          A month. Every feature, unlocked. The best way to use Your Money Life Saver — nothing held
          back and nothing sold on the side.
        </p>
      </section>

      <DemoNote>
        Billing is mocked. Choosing Premium here does not charge a card. The live app will use
        Stripe at {PREMIUM_PRICE_LABEL}/month.
      </DemoNote>

      <section aria-labelledby="included-heading" className="rounded-3xl border bg-card p-4">
        <h2 id="included-heading" className="font-serif text-2xl tracking-tight">
          All of it, included
        </h2>
        <ul className="mt-3 space-y-3">
          {premiumIncludes.map((feature) => (
            <li key={feature.title} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3.5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-medium">{feature.title}</span>
                <span className="block text-sm leading-5 text-muted-foreground">{feature.body}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Plus the free on-ramp: tracking, a few deals, and reminders. Premium is those, and the
          rest. One price.
        </p>
      </section>

      <section className="rounded-3xl bg-secondary px-4 py-4 text-sm leading-6">
        <p className="font-medium">The math is the pitch.</p>
        <p className="mt-1 text-muted-foreground">
          Adobe&apos;s hike is $5. Planet Fitness, unused, is $24.99. One of those covers Premium
          for the month and then some. A forgotten trial in the sample is $6 before it even starts.
        </p>
      </section>

      {justUpgraded && premium ? (
        <div className="rounded-3xl border border-primary/20 bg-card px-4 py-4" role="status">
          <p className="font-serif text-2xl tracking-tight">Premium is on in this demo.</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Auto-cancel, negotiation, instant alerts, every deal, and savings goals are unlocked.
            No card was charged. Stripe will bill {PREMIUM_PRICE_LABEL}/mo in the live app.
          </p>
          <Button asChild className="mt-4 h-12 w-full rounded-full">
            <Link href="/home">Back to the dashboard</Link>
          </Button>
        </div>
      ) : premium ? (
        <div className="space-y-2">
          <p className="rounded-2xl bg-secondary px-4 py-3 text-sm" role="status">
            You&apos;re previewing Premium. Everything in the demo is unlocked.
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-full"
            onClick={() => {
              setJustUpgraded(false);
              setPlan("free");
            }}
          >
            Return to the free on-ramp
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          className="h-14 w-full rounded-full text-base"
          onClick={() => {
            setPlan("premium");
            setJustUpgraded(true);
          }}
        >
          Get everything for {PREMIUM_PRICE_LABEL}
        </Button>
      )}

      <section aria-labelledby="free-heading" className="rounded-3xl border border-dashed p-4">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Free · the on-ramp
        </p>
        <h2 id="free-heading" className="mt-1 font-serif text-2xl tracking-tight">
          Enough to see the leaks.
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Limited on purpose. Track bills, glance at a few deals, set a reminder. Upgrade when you
          want the work done.
        </p>
        <ul className="mt-3 space-y-2">
          {freeIncludes.map((feature) => (
            <li key={feature.title} className="text-sm">
              <span className="font-medium">{feature.title}. </span>
              <span className="text-muted-foreground">{feature.body}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-2 pt-2">
        <Button type="button" variant="ghost" className="h-11 rounded-full" onClick={() => reset()}>
          Reset this demo
        </Button>
        <Button asChild variant="ghost" className="h-11 rounded-full">
          <Link href="/">Back to the website</Link>
        </Button>
      </div>
    </div>
  );
}
