import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";
import { Wordmark } from "@/components/wordmark";
import { FOUNDING_HAND_LABEL, FOUNDING_PREMIUM_LABEL, HAND_PRICE_LABEL, PREMIUM_PRICE_LABEL } from "@/lib/pricing";

const stickers = [
  { text: "price hike? caught", className: "bg-lime text-ink -top-4 -left-6", tilt: "-8deg" },
  { text: "$4.19 gas", className: "bg-cyan text-ink -right-4 top-16", tilt: "6deg" },
  { text: "trial? nope", className: "bg-sun text-ink -bottom-3 left-8", tilt: "-3deg" },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b-2 border-ink/10 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <Wordmark compact />
          <nav aria-label="Page" className="hidden items-center gap-6 text-sm font-semibold sm:flex">
            <a href="#deals" className="hover:text-primary">Deals</a>
            <a href="#help" className="hover:text-primary">Helpers</a>
            <a href="#pricing" className="hover:text-primary">Pricing</a>
          </nav>
          <Link
            href="/start"
            className="inline-flex h-11 items-center rounded-full bg-ink px-4 text-sm font-bold text-white"
          >
            Try it
          </Link>
        </div>
      </header>

      <main id="main">
        <section className="gradient-move overflow-hidden bg-gradient-to-br from-[#e01470] via-[#6d28d9] to-[#0891b2] text-white">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <a
                href="#waitlist"
                className="inline-block -rotate-2 rounded-full bg-lime px-3 py-2 text-sm font-bold tracking-wide text-ink"
              >
                Founding Member: {FOUNDING_PREMIUM_LABEL}/mo for life — join the waitlist now
              </a>
              <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[0.92] tracking-tight sm:text-7xl">
                Stop getting robbed by your bills.
              </h1>
              <p className="mt-4 max-w-md text-xl font-semibold">Open the app, see the cheapest gas near you.</p>
              <p className="mt-3 max-w-md text-lg font-semibold">Need a hand fixing the mower? Tap once.</p>
              <p className="mt-2 max-w-md text-lg font-semibold">Cheapest flights, hotels, and cars, all in one app.</p>
              <p className="mt-2 max-w-md text-lg font-semibold">Your own AI money-saver in your pocket.</p>
              <p className="mt-2 max-w-md text-lg font-semibold">
                Monthly Girls&apos; Night and Guys&apos; Night Out in your city.
              </p>
              <p className="mt-3 max-w-md text-base leading-7 text-white/85">
                LifeSaver flags the sneaky charges, sorts real nearby stations by price, and can
                send a helper for a small engine, a repair, or a heavy lift.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/start"
                  className="inline-flex h-14 items-center justify-center rounded-full bg-lime px-6 text-lg font-bold text-ink shadow-[4px_4px_0_#14081f]"
                >
                  Open the demo
                </Link>
                <a
                  href="#waitlist"
                  className="inline-flex h-14 items-center justify-center rounded-full bg-white px-6 text-lg font-bold text-ink"
                >
                  Get on the list
                </a>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-sm">
              <div className="rounded-[2rem] bg-white p-5 text-ink shadow-[8px_8px_0_rgba(0,0,0,0.25)]">
                <p className="text-xs font-bold tracking-wide text-primary uppercase">Sample month</p>
                <p className="mt-2 font-serif text-5xl leading-none">$186.40</p>
                <p className="mt-1 font-semibold">kept. without a spreadsheet.</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="rounded-2xl bg-muted px-3 py-2">Adobe hiked the price. We saw it.</li>
                  <li className="rounded-2xl bg-muted px-3 py-2">Hulu charged you twice.</li>
                  <li className="rounded-2xl bg-muted px-3 py-2">Cheapest gas in the sample: $4.19.</li>
                </ul>
              </div>
              {stickers.map((sticker) => (
                <span
                  key={sticker.text}
                  className={`sticker absolute hidden rounded-full px-3 py-1 text-xs font-bold shadow-md lg:inline-block ${sticker.className}`}
                  style={{ ["--tilt" as string]: sticker.tilt }}
                >
                  {sticker.text}
                </span>
              ))}
              <span
                className="sticker absolute -top-3 -left-2 rounded-full bg-lime px-3 py-1 text-xs font-bold text-ink shadow-md lg:hidden"
                style={{ ["--tilt" as string]: "-8deg" }}
              >
                price hike? caught
              </span>
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-b-2 border-ink/10 bg-sun py-3" aria-hidden="true">
          <p className="whitespace-nowrap text-sm font-bold tracking-wide text-ink">
            PRICE HIKES · DUPLICATE CHARGES · FORGOTTEN TRIALS · UNUSED MEMBERSHIPS · CHEAP GAS ·
            GROCERY DEALS · ODD JOBS · RIDES · PRICE HIKES · DUPLICATE CHARGES ·
          </p>
        </section>

        <section id="deals" className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-14 sm:grid-cols-3">
          {[
            ["Snitch on subscriptions", "Price jumps, double charges, trials you forgot. We tap you before they tap your card."],
            ["Cheap, nearby", "Gas, groceries, and lunch. Distance and the savings, in one list."],
            ["Need a person?", "Lend a Hand posts the odd job. Helpers offer. You book. Sample people for now."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-3xl border-2 border-ink/10 bg-card p-5 shadow-[4px_4px_0_#2a1038]">
              <h2 className="font-serif text-2xl leading-tight">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>

        <section id="pricing" className="bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-14">
            <h2 className="font-serif text-4xl leading-[0.95] tracking-tight sm:text-6xl">
              Everything.
              <br />
              Then a person,
              <br />
              if you want one.
            </h2>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <article className="rounded-3xl bg-ink p-6 text-white">
                <p className="text-xs font-bold tracking-wide text-lime uppercase">Premium</p>
                <p className="mt-2 font-serif text-5xl">{FOUNDING_PREMIUM_LABEL}</p>
                <p className="text-sm text-white/75">
                  a month for life if you join the waitlist. After launch: {PREMIUM_PRICE_LABEL}/mo.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li>Auto-cancel and bill negotiation</li>
                  <li>Instant alerts</li>
                  <li>Every local deal</li>
                  <li>Savings goals</li>
                </ul>
              </article>
              <article id="help" className="rounded-3xl bg-gradient-to-br from-[#e01470] to-[#6d28d9] p-6 text-white">
                <p className="text-xs font-bold tracking-wide text-lime uppercase">Lend a Hand</p>
                <p className="mt-2 font-serif text-5xl">{FOUNDING_HAND_LABEL}</p>
                <p className="text-sm text-white/80">
                  a month for life on the waitlist. After launch: {HAND_PRICE_LABEL}/mo. Everything in Premium, plus helpers.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li>Post yard work, moving, assembly, cleanup, errands</li>
                  <li>See offers from nearby helpers</li>
                  <li>Book and confirm in the app</li>
                  <li>All of Premium, included</li>
                </ul>
              </article>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Free is the on-ramp: track bills, peek at a few deals, set a reminder. Rides open Uber,
              Lyft, Uber Eats, and DoorDash in their own apps. LifeSaver is not their partner.
            </p>
          </div>
        </section>

        <section id="waitlist" className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="font-serif text-4xl leading-[0.95] tracking-tight sm:text-5xl">
              Get the drop.
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              The waitlist is stored for real. Drop your email. If a friend sent you, their code
              rides along. TikTok, Instagram, X, Reddit, and Facebook links are tagged too.
            </p>
          </div>
          <WaitlistForm />
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-14">
          <Link
            href="/giveaway"
            className="block rounded-3xl bg-gradient-to-br from-[#ffb800] via-[#ff4fa3] to-[#7c3aed] px-6 py-6 text-white shadow-lg"
          >
            <p className="text-xs font-bold tracking-wide uppercase">Weekly giveaway</p>
            <p className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">$100 every week — free to enter</p>
            <p className="mt-1 text-sm text-white/90">
              One entry per person, drawn every Sunday at 8 PM Central. No purchase necessary. See Official Rules.
            </p>
          </Link>
        </section>
      </main>

      <footer className="border-t-2 border-ink/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark compact />
          <p className="max-w-md text-sm text-muted-foreground">
            LifeSaver is a prototype. Sample prices, sample helpers, sample rides. No bank is
            connected.
          </p>
        </div>
      </footer>
    </div>
  );
}
