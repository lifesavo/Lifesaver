"use client";

import Link from "next/link";
import { Suspense } from "react";
import { DemoNote, ExampleTag } from "@/components/demo-note";
import { FuelCard } from "@/components/fuel-card";
import { GetAHand } from "@/components/get-a-hand";
import { GiveawayCard } from "@/components/giveaway/giveaway-card";
import { AiBadge, AiSection } from "@/components/ai/ai-badge";
import { PlanChip } from "@/components/plan-chip";
import { WeatherCard } from "@/components/weather-card";
import { AlertsBanner } from "@/components/alerts";
import { alerts, bills, institutions, ledger, MONTH_SAVED } from "@/lib/demo-data";
import { money } from "@/lib/money";
import { PREMIUM_PRICE_LABEL } from "@/lib/pricing";
import { useProfile } from "@/lib/profile";
import { TrialBanner } from "@/components/trial-banner";
import { ReceiptsHomeCard } from "@/components/fetch-prompt";

export function HomeScreen() {
  const { profile, account } = useProfile();
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
      <Suspense fallback={null}><TrialBanner /></Suspense>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Hello, {firstName}</p>
          <p className="font-serif text-2xl tracking-tight">Today</p>
          <AiBadge className="mt-1" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <PlanChip />
          <Link href="/settings" className="text-xs font-semibold text-primary underline">
            {account ? "Account" : "Sign in"}
          </Link>
        </div>
      </header>

      <section aria-labelledby="tip-heading" className="rounded-3xl bg-lime px-4 py-4 text-ink">
        <h2 id="tip-heading" className="text-xs font-bold tracking-wide uppercase">
          Today&apos;s savings tip
        </h2>
        <p className="mt-1 text-sm leading-6">{tip}</p>
      </section>

      <AlertsBanner zip={profile.zip} />

      <Link href="/roadside" className="flex items-center gap-3 rounded-3xl bg-[#dc2626] px-4 py-4 text-white shadow-[4px_4px_0_#2a1038]">
        <span className="text-4xl" aria-hidden="true">🛞</span>
        <span>
          <span className="block font-serif text-2xl leading-tight">Roadside Help</span>
          <span className="block text-sm text-white/90">Flat tire, breakdown, out of gas, locked out, dead battery, or an accident. Tap for help now.</span>
        </span>
      </Link>

      <Link href="/help" className="block rounded-3xl bg-gradient-to-br from-[#6d28d9] to-[#0891b2] px-4 py-4 text-white">
        <p className="text-xs font-bold tracking-wide text-lime uppercase">Get a Hand</p>
        <p className="font-serif text-2xl leading-tight">A ride, a plumber, a hand moving</p>
        <p className="mt-1 text-sm text-white/90">Ask Lend a Hand members nearby, or find a licensed pro. You&apos;ll see when someone accepts.</p>
      </Link>

      <WeatherCard zip={profile.zip} />

      <GiveawayCard email={profile.email} />

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
      <Link href="/grocery" className="flex items-center gap-3 rounded-3xl bg-lime px-4 py-4 text-ink">
        <span className="text-4xl" aria-hidden="true">🛒</span>
        <span>
          <span className="block text-xs font-bold tracking-wide uppercase">New · Free</span>
          <span className="block font-serif text-2xl leading-tight">Grocery list</span>
          <span className="block text-sm">Check it off in the aisle and see which store is cheaper for your cart.</span>
        </span>
      </Link>
      <Link href="/split" className="flex items-center gap-3 rounded-3xl bg-cyan px-4 py-4 text-ink">
        <span className="text-4xl" aria-hidden="true">🧾</span>
        <span>
          <span className="block text-xs font-bold tracking-wide uppercase">New · Free</span>
          <span className="block font-serif text-2xl leading-tight">Tip &amp; split</span>
          <span className="block text-sm">Tip and who owes what, evenly or by what each person ordered.</span>
        </span>
      </Link>
      <Link href="/todo" className="flex items-center gap-3 rounded-3xl bg-sun px-4 py-4 text-ink">
        <span className="text-4xl" aria-hidden="true">✅</span>
        <span>
          <span className="block text-xs font-bold tracking-wide uppercase">New · Free</span>
          <span className="block font-serif text-2xl leading-tight">To-do &amp; reminders</span>
          <span className="block text-sm">Due dates, repeating chores, and reminders in your phone&apos;s calendar.</span>
        </span>
      </Link>
      <Link href="/budget" className="flex items-center gap-3 rounded-3xl bg-pop px-4 py-4 text-white">
        <span className="text-4xl" aria-hidden="true">💸</span>
        <span>
          <span className="block text-xs font-bold tracking-wide uppercase">New · Free</span>
          <span className="block font-serif text-2xl leading-tight">Budget</span>
          <span className="block text-sm">Set what you want to spend, log it in two taps, see what&apos;s left.</span>
        </span>
      </Link>
      <Link href="/car" className="flex items-center gap-3 rounded-3xl bg-mint px-4 py-4 text-ink">
        <span className="text-4xl" aria-hidden="true">🚗</span>
        <span>
          <span className="block text-xs font-bold tracking-wide uppercase">New · Free</span>
          <span className="block font-serif text-2xl leading-tight">Car care</span>
          <span className="block text-sm">Oil changes, tires, and filters by miles or months, plus what you spent.</span>
        </span>
      </Link>
      <Link href="/meds" className="flex items-center gap-3 rounded-3xl bg-gold px-4 py-4 text-ink">
        <span className="text-4xl" aria-hidden="true">💊</span>
        <span>
          <span className="block text-xs font-bold tracking-wide uppercase">New · Free</span>
          <span className="block font-serif text-2xl leading-tight">Meds</span>
          <span className="block text-sm">Check off each dose, get a refill heads-up, and daily alarms in your calendar.</span>
        </span>
      </Link>
      <Link href="/meals" className="flex items-center gap-3 rounded-3xl bg-sun px-4 py-4 text-ink">
        <span className="text-4xl" aria-hidden="true">🍽️</span>
        <span>
          <span className="block text-xs font-bold tracking-wide uppercase">New · Free</span>
          <span className="block font-serif text-2xl leading-tight">Meals</span>
          <span className="block text-sm">Plan the week&apos;s meals and send the ingredients to your Grocery list.</span>
        </span>
      </Link>
      <Link href="/packages" className="flex items-center gap-3 rounded-3xl bg-cyan px-4 py-4 text-ink">
        <span className="text-4xl" aria-hidden="true">📦</span>
        <span>
          <span className="block text-xs font-bold tracking-wide uppercase">New · Free</span>
          <span className="block font-serif text-2xl leading-tight">Packages</span>
          <span className="block text-sm">Every tracking number in one list, one tap to the carrier&apos;s tracking page.</span>
        </span>
      </Link>
      <Link href="/notes" className="flex items-center gap-3 rounded-3xl bg-gold px-4 py-4 text-ink">
        <span className="text-4xl" aria-hidden="true">📝</span>
        <span>
          <span className="block text-xs font-bold tracking-wide uppercase">New · Free</span>
          <span className="block font-serif text-2xl leading-tight">Notes</span>
          <span className="block text-sm">Quick notes and checklists you can pin, search, color, and share.</span>
        </span>
      </Link>
      <ReceiptsHomeCard />
      <Link href="/plan" className="block rounded-3xl bg-gradient-to-br from-[#ff7a18] via-[#e01470] to-[#6d28d9] px-4 py-4 text-white">
        <p className="text-xs font-bold tracking-wide text-lime uppercase">New · Free</p>
        <p className="font-serif text-2xl leading-tight">Plan a trip in seconds</p>
        <p className="mt-1 text-sm text-white/90">Day-by-day itinerary, budget split, packing list, and it drops right into your calendar.</p>
      </Link>
      <Link href="/travel" className="block rounded-3xl bg-cyan px-4 py-4 text-ink">
        <p className="text-xs font-bold tracking-wide uppercase">Lend a Hand</p>
        <p className="font-serif text-2xl leading-tight">Cheapest flights, hotels, and cars</p>
        <p className="mt-1 text-sm">All in one search. Free and Premium get an upgrade prompt.</p>
      </Link>

      <AiSection />

      <section aria-labelledby="bill-example-heading" className="space-y-1 pt-2">
        <h2 id="bill-example-heading" className="font-serif text-2xl tracking-tight">
          Bill tracking <ExampleTag className="ml-1 align-middle" />
        </h2>
        <DemoNote>
          Bank linking is coming soon. Until then, this is an example of what LifeSaver catches in a
          typical month ({connected.map((item) => item.name).join(", ")}). These are not your accounts.
        </DemoNote>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#e01470] via-[#6d28d9] to-[#0891b2] px-5 py-6 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -top-12 -right-8 size-40 rounded-full bg-white/10" />
        <p className="text-sm text-white/80">Example: what one month can look like</p>
        <p className="mt-1 font-serif text-5xl tracking-tight">{money(MONTH_SAVED)}</p>
        <h2 className="mt-1 text-lg">kept in a month</h2>
        <p className="mt-3 max-w-[18rem] text-sm leading-6 text-white/85">
          Deals used, a trial caught, and a duplicate charge refunded.
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
          Four leaks in the example. Instant alerts on your own bills are part of Premium
          ({PREMIUM_PRICE_LABEL}/mo) once bank linking opens.
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

      <Link href="/fuel" className="block rounded-2xl bg-secondary px-4 py-4">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">Near you</p>
        <p className="mt-1 font-medium">Find the cheapest gas near you</p>
        <p className="mt-1 text-sm text-muted-foreground">Stations sorted by price and distance</p>
      </Link>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/bills" className="rounded-2xl bg-card px-3 py-3 text-sm font-semibold shadow-sm">
          Bills
        </Link>
        <Link href="/savings" className="rounded-2xl bg-card px-3 py-3 text-sm font-semibold shadow-sm">
          Savings
        </Link>
        <Link href="/help" className="rounded-2xl bg-lime px-3 py-3 text-sm font-bold text-ink">
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
            Founding members lock in $7.99/mo for life (regular $9.99). Lend a Hand: $14.99/mo for life (regular $19.99). Billing opens soon.
          </p>
        </Link>
      ) : (
        <p className="rounded-2xl bg-secondary px-4 py-3 text-sm leading-6">
          Your founding rate is locked in. Everything is unlocked free until billing opens, and we will email you before any charge.
        </p>
      )}
    </div>
  );
}
