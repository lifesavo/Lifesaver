"use client";

import Link from "next/link";
import { DemoNote } from "@/components/demo-note";
import { PlanChip } from "@/components/plan-chip";
import { alerts, bills, DEMO_AS_OF, institutions, ledger, MONTH_SAVED } from "@/lib/demo-data";
import { areaLabel, money } from "@/lib/money";
import { PREMIUM_PRICE_LABEL } from "@/lib/pricing";
import { useProfile } from "@/lib/profile";

export function HomeScreen() {
  const { profile } = useProfile();
  if (!profile) return null;

  const upcoming = [...bills].sort((a, b) => a.renewsOn.localeCompare(b.renewsOn)).slice(0, 4);
  const connected = institutions.filter((item) => profile.institutions.includes(item.id));
  const firstName = profile.email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Hello, {firstName}</p>
          <h1 className="font-serif text-3xl tracking-tight">Your month, so far</h1>
        </div>
        <PlanChip />
      </header>

      <DemoNote>
        Figures are a made-up November for {areaLabel(profile.zip)}, as of {DEMO_AS_OF}. Connected
        accounts are samples: {connected.map((item) => item.name).join(", ")}.
      </DemoNote>

      <section className="relative overflow-hidden rounded-3xl bg-primary px-5 py-6 text-primary-foreground">
        <div aria-hidden="true" className="pointer-events-none absolute -top-12 -right-8 size-40 rounded-full bg-white/10" />
        <p className="text-sm text-primary-foreground/80">You saved</p>
        <p className="mt-1 font-serif text-5xl tracking-tight">{money(MONTH_SAVED)}</p>
        <h2 className="mt-1 text-lg">this month</h2>
        <p className="mt-3 max-w-[18rem] text-sm leading-6 text-primary-foreground/80">
          Deals you used, a trial you caught, and a duplicate that came back. Sample ledger.
        </p>
        <details className="mt-4 rounded-2xl bg-white/10 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium">Where this came from</summary>
          <ul className="mt-2 space-y-1.5">
            {ledger.map((row) => (
              <li key={row.label} className="flex items-baseline justify-between gap-3">
                <span className="text-primary-foreground/85">{row.label}</span>
                <span className="font-medium tabular-nums">{money(row.amount)}</span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section aria-labelledby="alerts-heading" className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <h2 id="alerts-heading" className="font-serif text-2xl tracking-tight">
            Alerts
          </h2>
          <p className="text-xs text-muted-foreground">Instant alerts · Premium</p>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Four leaks in the sample. On the free on-ramp you can read them here; live instant alerts
          are part of Premium ({PREMIUM_PRICE_LABEL}/mo).
        </p>
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <Link
                href={`/bills#${alert.billId}`}
                className="block rounded-2xl border bg-card px-4 py-3 shadow-sm"
              >
                <p className="text-xs font-semibold tracking-wide text-clay uppercase">{alert.kicker}</p>
                <p className="mt-1 font-medium">{alert.title}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{alert.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="upcoming-heading" className="space-y-2">
        <div className="flex items-end justify-between">
          <h2 id="upcoming-heading" className="font-serif text-2xl tracking-tight">
            Upcoming
          </h2>
          <Link href="/bills" className="text-sm font-medium text-primary">
            All bills
          </Link>
        </div>
        <ul className="overflow-hidden rounded-2xl border bg-card">
          {upcoming.map((bill) => (
            <li key={bill.id} className="border-b last:border-b-0">
              <Link href={`/bills#${bill.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <span>
                  <span className="block font-medium">{bill.name}</span>
                  <span className="block text-xs text-muted-foreground">{bill.renewsLabel}</span>
                </span>
                <span className="font-medium tabular-nums">
                  {bill.amount === 0 ? "$0.00" : money(bill.amount)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Link href="/deals" className="block rounded-2xl bg-secondary px-4 py-4">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">Near you</p>
        <p className="mt-1 font-medium">Cheapest gas in the sample is $4.19 at Costco</p>
        <p className="mt-1 text-sm text-muted-foreground">1.6 miles · save $0.46 a gallon vs the area average</p>
      </Link>

      {profile.plan === "free" ? (
        <Link href="/pricing" className="block rounded-3xl bg-forest px-5 py-5 text-primary-foreground">
          <p className="font-serif text-3xl leading-none tracking-tight">
            Everything.
            <br />
            One price.
            <br />
            {PREMIUM_PRICE_LABEL}.
          </p>
          <p className="mt-3 text-sm leading-6 text-primary-foreground/80">
            Auto-cancel, negotiation, instant alerts, every deal, and savings goals. Free stays a
            short on-ramp.
          </p>
        </Link>
      ) : (
        <p className="rounded-2xl bg-secondary px-4 py-3 text-sm leading-6">
          Premium demo is on. Every feature in this prototype is unlocked, and no card was charged.
        </p>
      )}
    </div>
  );
}
