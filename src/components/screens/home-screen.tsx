"use client";

import Link from "next/link";
import { DemoNote } from "@/components/demo-note";
import { FuelCard } from "@/components/fuel-card";
import { GetAHand } from "@/components/get-a-hand";
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
  const tips = [
    "Cancel a free trial the same day you start it, and put the reminder on your calendar before the password is gone.",
    "Check the regular grade first. Premium only helps if the car actually asks for it.",
    "A duplicate charge is often the same merchant twice in one week. Open Bills and mark it.",
    "A price hike on a subscription is easier to catch the week it hits, not three months later.",
    "If a station is an estimate, treat it as a shortlist, then confirm the pump price before you fill up.",
  ];
  const tip = tips[new Date().getUTCDate() % tips.length];

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Hello, {firstName}</p>
          <p className="font-serif text-2xl tracking-tight">Today</p>
        </div>
        <PlanChip />
      </header>

      <section aria-labelledby="tip-heading" className="rounded-3xl bg-lime px-4 py-4 text-ink">
        <h2 id="tip-heading" className="text-xs font-bold tracking-wide uppercase">
          Today&apos;s savings tip
        </h2>
        <p className="mt-1 text-sm leading-6">{tip}</p>
      </section>

      <FuelCard zip={profile.zip} />
      <GetAHand zip={profile.zip} />

      <div className="grid grid-cols-2 gap-2">
        <Link href="/deals" className="rounded-3xl bg-secondary px-3 py-4">
          <p className="text-xs font-bold tracking-wide text-primary uppercase">Deals</p>
          <p className="mt-1 font-serif text-xl leading-tight">Grocery, gas, food</p>
        </Link>
        <Link href="/nights" className="rounded-3xl bg-ink px-3 py-4 text-white">
          <p className="text-xs font-bold tracking-wide text-lime uppercase">Events</p>
          <p className="mt-1 font-serif text-xl leading-tight">LifeSaver Nights</p>
          <p className="mt-1 text-xs text-white/80">Girls&apos; Night and Guys&apos; Night. Coming soon until posted.</p>
        </Link>
      </div>
      <Link href="/travel" className="block rounded-3xl bg-cyan px-4 py-4 text-ink">
        <p className="text-xs font-bold tracking-wide uppercase">Lend a Hand</p>
        <p className="font-serif text-2xl leading-tight">Cheapest flights, hotels, and cars</p>
        <p className="mt-1 text-sm">All in one search. Free and Premium get an upgrade prompt.</p>
      </Link>

      <DemoNote>
        Figures are a made-up November for {areaLabel(profile.zip)}, as of {DEMO_AS_OF}. Connected
        accounts are samples: {connected.map((item) => item.name).join(", ")}.
      </DemoNote>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#e01470] via-[#6d28d9] to-[#0891b2] px-5 py-6 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -top-12 -right-8 size-40 rounded-full bg-white/10" />
        <p className="text-sm text-white/80">You saved</p>
        <p className="mt-1 font-serif text-5xl tracking-tight">{money(MONTH_SAVED)}</p>
        <h2 className="mt-1 text-lg">this month</h2>
        <p className="mt-3 max-w-[18rem] text-sm leading-6 text-white/85">
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

      <div className="grid grid-cols-2 gap-2">
        <Link href="/bills" className="rounded-2xl bg-card px-3 py-3 text-sm font-semibold shadow-sm">
          Bills
        </Link>
        <Link href="/savings" className="rounded-2xl bg-card px-3 py-3 text-sm font-semibold shadow-sm">
          Savings
        </Link>
        <Link href="/hand" className="rounded-2xl bg-lime px-3 py-3 text-sm font-bold text-ink">
          Lend a Hand
        </Link>
        <Link href="/rides" className="rounded-2xl bg-cyan px-3 py-3 text-sm font-bold text-ink">
          Rides
        </Link>
      </div>

      {profile.plan === "free" ? (
        <Link href="/pricing" className="block rounded-3xl bg-ink px-5 py-5 text-white">
          <p className="font-serif text-3xl leading-none tracking-tight">
            Everything.
            <br />
            One price.
            <br />
            {PREMIUM_PRICE_LABEL}.
          </p>
          <p className="mt-3 text-sm leading-6 text-white/80">
            Premium is $9.99 after launch. Lend a Hand is $24.99 after launch, or $20.00 for life on the waitlist.
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
