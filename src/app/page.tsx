import Link from "next/link";
import { TryItFreeLink } from "@/components/try-it-free";
import { AiBadge, AiSection } from "@/components/ai/ai-badge";
import { InstallButton } from "@/components/pwa/install-button";
import { WaitlistForm } from "@/components/waitlist-form";
import { Wordmark } from "@/components/wordmark";
import { FOUNDING_HAND_LABEL, FOUNDING_PREMIUM_LABEL, HAND_PRICE_LABEL, PREMIUM_PRICE_LABEL } from "@/lib/pricing";

const stickers = [
  { text: "price hike? caught", className: "bg-lime text-ink -top-4 -left-6", tilt: "-8deg" },
  { text: "$4.19 gas", className: "bg-cyan text-ink -right-4 top-16", tilt: "6deg" },
  { text: "double charge", className: "bg-sun text-ink -bottom-3 left-8", tilt: "-3deg" },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background pb-28 text-foreground sm:pb-0">
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
          <div className="flex items-center gap-2">
            <InstallButton
              label="Get the app"
              className="h-11 rounded-full border-2 border-ink/15 px-3 text-sm font-bold"
            />
            <TryItFreeLink
              event="try_it_free_header"
              className="inline-flex h-11 items-center rounded-full bg-ink px-4 text-sm font-bold text-white"
            >
              Try it free
            </TryItFreeLink>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="gradient-move overflow-hidden bg-gradient-to-br from-[#e01470] via-[#6d28d9] to-[#0891b2] text-white">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-8 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
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
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <TryItFreeLink
                  event="try_it_free_hero"
                  className="inline-flex h-16 items-center justify-center rounded-full bg-lime px-8 text-xl font-bold text-ink shadow-[4px_4px_0_#14081f]"
                >
                  Try it free
                </TryItFreeLink>
                <InstallButton className="h-14 rounded-full border-2 border-white px-6 text-lg font-bold text-white" />
              </div>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/90">
                7 days free, then {PREMIUM_PRICE_LABEL}/month. Cancel anytime before your trial ends and you won&apos;t be charged.
                You can cancel in Settings under Manage billing, which opens Stripe&apos;s billing portal.
              </p>
              <p className="mt-3 max-w-md text-sm text-white/80">
                <Link href="/giveaway" className="font-semibold underline decoration-white/50 underline-offset-2 hover:decoration-white">
                  Enter this week&apos;s giveaway
                </Link>
                {" "}
                — free to enter, no purchase necessary.
              </p>
              <p className="mt-6 max-w-md text-lg font-semibold">Need a hand fixing the mower? Tap once.</p>
              <p className="mt-2 max-w-md text-lg font-semibold">Cheapest flights, hotels, and cars, all in one app.</p>
              <p className="mt-2 max-w-md text-lg font-semibold">Your own AI money-saver in your pocket.</p>
              <p className="mt-2 max-w-md text-lg font-semibold">Plan a whole trip and know what to wear today.</p>
              <AiBadge className="mt-3" />
              <p className="mt-2 max-w-md text-lg font-semibold">
                Monthly Girls&apos; Night and Guys&apos; Night Out in your city.
              </p>
              <p className="mt-3 max-w-md text-base leading-7 text-white/85">
                LifeSaver sorts nearby gas by price, tells you what to wear, warns you about storms,
                and connects you with neighbors who can lend a hand. Bill tracking is rolling out next.
              </p>
            </div>
            <div className="relative mx-auto w-full max-w-sm">
              <div className="rounded-[2rem] bg-white p-5 text-ink shadow-[8px_8px_0_rgba(0,0,0,0.25)]">
                <p className="text-xs font-bold tracking-wide text-primary uppercase">Example month</p>
                <p className="mt-2 font-serif text-5xl leading-none">$186.40</p>
                <p className="mt-1 font-semibold">kept. without a spreadsheet.</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="rounded-2xl bg-muted px-3 py-2">Adobe hiked the price. We saw it.</li>
                  <li className="rounded-2xl bg-muted px-3 py-2">Hulu charged you twice.</li>
                  <li className="rounded-2xl bg-muted px-3 py-2">Cheapest gas nearby: $4.19.</li>
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
            ["Need a person?", "Ask for a ride, a hand at home, or roadside help. Lend a Hand members nearby can pick it up."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-3xl border-2 border-ink/10 bg-card p-5 shadow-[4px_4px_0_#2a1038]">
              <h2 className="font-serif text-2xl leading-tight">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>

        <div className="mx-auto w-full max-w-6xl px-4 py-8">
          <AiSection dark />
        </div>

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
                  a month for life as a founding member. Regular price: {PREMIUM_PRICE_LABEL}/mo. Billing opens soon.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li>Auto-cancel and bill negotiation (rolling out with bank linking)</li>
                  <li>Instant alerts</li>
                  <li>Every local deal</li>
                  <li>Savings goals</li>
                </ul>
              </article>
              <article id="help" className="rounded-3xl bg-gradient-to-br from-[#e01470] to-[#6d28d9] p-6 text-white">
                <p className="text-xs font-bold tracking-wide text-lime uppercase">Lend a Hand</p>
                <p className="mt-2 font-serif text-5xl">{FOUNDING_HAND_LABEL}</p>
                <p className="text-sm text-white/80">
                  a month for life as a founding member. Regular price: {HAND_PRICE_LABEL}/mo. Everything in Premium, plus helpers.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li>Post yard work, moving, assembly, cleanup, errands</li>
                  <li>Nearby members can take your request</li>
                  <li>Weather alerts, trip planner, roadside help</li>
                  <li>All of Premium, included</li>
                  <li>Earn by helping neighbors and stranded drivers. Included.</li>
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
              Lock in your rate.
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Lock in founding pricing for life before billing opens. Drop your email and we will tell you
              before anything is charged. If a friend sent you, their code rides along.
            </p>
          </div>
          <WaitlistForm />
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-14">
          <div className="rounded-3xl bg-gradient-to-br from-[#ffb800] via-[#ff4fa3] to-[#7c3aed] px-6 py-6 text-white shadow-lg">
            <Link href="/giveaway" className="block">
              <p className="text-xs font-bold tracking-wide uppercase">Weekly giveaway</p>
              <p className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">
                One winner gets $100 every week — free to enter
              </p>
              <p className="mt-1 text-sm text-white/90">
                One entry per person, drawn every Sunday at 8 PM Central. No purchase necessary.
              </p>
            </Link>
            <p className="mt-3 text-sm text-white/90">
              <Link href="/giveaway-rules" className="font-semibold underline">
                Official Rules
              </Link>
            </p>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink/10 bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.15)] sm:hidden">
        <TryItFreeLink
          event="try_it_free_sticky"
          className="flex h-14 items-center justify-center rounded-full bg-lime text-lg font-bold text-ink shadow-[3px_3px_0_#14081f]"
        >
          Try it free
        </TryItFreeLink>
        <p className="mt-1.5 text-center text-[11px] leading-4 text-muted-foreground">
          7 days free, then {PREMIUM_PRICE_LABEL}/month. Cancel anytime before your trial ends and you won&apos;t be charged.
        </p>
      </div>

      <footer className="border-t-2 border-ink/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark compact />
          <div className="max-w-md space-y-2 text-sm text-muted-foreground">
            <p>
              Gas and deal prices are estimates, so check at the pump or store. Rides open Uber, Lyft, and others in their own apps.
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/giveaway" className="font-semibold text-foreground underline">
                Weekly $100 giveaway
              </Link>
              <Link href="/giveaway-rules" className="font-semibold text-foreground underline">
                Official Rules
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
