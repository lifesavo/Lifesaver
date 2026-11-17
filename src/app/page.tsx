import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";
import { Wordmark } from "@/components/wordmark";
import { alerts, DEMO_AS_OF, MONTH_SAVED } from "@/lib/demo-data";
import { money } from "@/lib/money";
import { freeIncludes, PREMIUM_PRICE_LABEL, premiumIncludes } from "@/lib/pricing";

const steps = [
  {
    n: "1",
    title: "Tell us your email and ZIP",
    body: "So savings notes and local deals know where you are.",
  },
  {
    n: "2",
    title: "Connect accounts",
    body: "Mocked today. The live app will use Plaid, read-only, and never your bank password.",
  },
  {
    n: "3",
    title: "We flag the leaks and the deals",
    body: "Price hikes, duplicates, forgotten trials, unused memberships — and cheaper gas, groceries, and meals nearby.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <Wordmark compact />
          <nav aria-label="Page" className="hidden items-center gap-6 text-sm font-medium sm:flex">
            <a href="#watchdog" className="text-muted-foreground hover:text-foreground">
              Watchdog
            </a>
            <a href="#deals" className="text-muted-foreground hover:text-foreground">
              Deals
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground">
              Pricing
            </a>
          </nav>
          <Link
            href="/start"
            className="inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Try the demo
          </Link>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
              Bill watchdog + daily local deals
            </p>
            <h1 className="mt-3 max-w-xl font-serif text-[2.6rem] leading-[1.02] tracking-tight sm:text-6xl">
              Keep more of your money, on ordinary days.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Your Money Life Saver watches the quiet charges — price hikes, duplicate bills,
              forgotten trials, memberships you stopped using — and puts the cheapest gas, groceries,
              and meals near you in the same calm place.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/start"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-5 text-base font-medium text-primary-foreground"
              >
                Open the prototype
              </Link>
              <a
                href="#waitlist"
                className="inline-flex h-12 items-center justify-center rounded-full border bg-card px-5 text-base font-medium"
              >
                Join the waitlist
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Prototype with sample data as of {DEMO_AS_OF}. No bank is connected.
            </p>
          </div>

          <div className="mx-auto w-full max-w-sm rounded-[2rem] bg-[#d5e6db] p-3 shadow-xl ring-1 ring-forest/10">
            <div className="rounded-[1.5rem] bg-background p-4">
              <p className="text-xs text-muted-foreground">Sample month</p>
              <p className="mt-1 text-sm">You saved</p>
              <p className="font-serif text-5xl tracking-tight text-primary">{money(MONTH_SAVED)}</p>
              <p className="text-sm text-muted-foreground">this month</p>
              <ul className="mt-4 space-y-2">
                {alerts.slice(0, 3).map((alert) => (
                  <li key={alert.id} className="rounded-2xl bg-muted px-3 py-2">
                    <p className="text-xs font-semibold text-clay">{alert.kicker}</p>
                    <p className="text-sm font-medium">{alert.title}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-y bg-card" aria-label="Sample month at a glance">
          <ul className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 sm:grid-cols-3">
            <li>
              <p className="font-serif text-3xl text-primary">{money(MONTH_SAVED)}</p>
              <p className="text-sm text-muted-foreground">saved in the sample month</p>
            </li>
            <li>
              <p className="font-serif text-3xl text-primary">4</p>
              <p className="text-sm text-muted-foreground">kinds of leak we flag</p>
            </li>
            <li>
              <p className="font-serif text-3xl text-primary">{PREMIUM_PRICE_LABEL}</p>
              <p className="text-sm text-muted-foreground">a month for every feature</p>
            </li>
          </ul>
        </section>

        <section id="watchdog" className="mx-auto w-full max-w-6xl px-4 py-14">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                The watchdog
              </p>
              <h2 className="mt-2 font-serif text-4xl tracking-tight">Bills that creep, caught.</h2>
              <p className="mt-3 max-w-md text-base leading-7 text-muted-foreground">
                See the amount, the renewal, and the last time you actually used it. Then ask us to
                cancel, negotiate, or just remind you. In this demo those requests stop at a
                confirmation. They do not contact the company.
              </p>
            </div>
            <ul className="overflow-hidden rounded-3xl border bg-card">
              {[
                ["Adobe Creative Cloud", "Price hike · $59.99", "Was $54.99"],
                ["Hulu", "Duplicate · $18.99", "Charged twice this week"],
                ["NYT Games", "Trial ends Nov 19", "Then $6.00/mo"],
                ["Planet Fitness", "Unused · $24.99", "No visit in 46 days"],
              ].map(([name, meta, note]) => (
                <li key={name} className="border-b px-4 py-3 last:border-b-0">
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-muted-foreground">
                    {meta} · {note}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="deals" className="bg-secondary/70">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                Daily deals
              </p>
              <h2 className="mt-2 font-serif text-4xl tracking-tight">The cheap option, nearby.</h2>
              <p className="mt-3 max-w-md text-base leading-7 text-muted-foreground">
                Cheapest gas, grocery specials, and food deals, with distance and the savings spelled
                out. Filter by what you need today. Live prices will come from gas, grocery, and
                affiliate feeds. These are samples.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                ["Gas", "Costco Gasoline", "$4.19/gal", "1.6 mi · save $0.46"],
                ["Groceries", "Grocery Outlet eggs", "$3.49", "0.9 mi · save $2.50"],
                ["Food", "El Farolito after 3pm", "$10.00", "0.5 mi · save $3.50"],
              ].map(([kind, name, price, meta]) => (
                <li key={kind} className="flex items-center justify-between gap-3 rounded-3xl bg-card px-4 py-4 shadow-sm">
                  <span>
                    <span className="block text-xs font-semibold tracking-wide text-primary uppercase">
                      {kind}
                    </span>
                    <span className="block font-medium">{name}</span>
                    <span className="block text-sm text-muted-foreground">{meta}</span>
                  </span>
                  <span className="font-serif text-2xl">{price}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14" aria-labelledby="how-heading">
          <h2 id="how-heading" className="font-serif text-4xl tracking-tight">
            How the demo works
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {steps.map((step) => (
              <li key={step.n} className="rounded-3xl border bg-card p-5">
                <p className="font-serif text-3xl text-primary">{step.n}</p>
                <h3 className="mt-2 font-medium">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="pricing" className="border-t bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-14">
            <p className="font-serif text-4xl leading-[0.95] tracking-tight sm:text-6xl">
              Everything.
              <br />
              One price.
              <br />
              <span className="text-primary">{PREMIUM_PRICE_LABEL}.</span>
            </p>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Premium is the product: every feature, unlocked, for {PREMIUM_PRICE_LABEL} a month.
              Free is a short on-ramp so you can see the leaks before you ask us to fix them.
            </p>
            <div className="mt-8 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <article className="rounded-3xl bg-primary p-6 text-primary-foreground">
                <h2 className="font-serif text-3xl">Premium · all-inclusive</h2>
                <p className="mt-1 text-sm text-primary-foreground/80">{PREMIUM_PRICE_LABEL}/month</p>
                <ul className="mt-4 space-y-3">
                  {premiumIncludes.map((feature) => (
                    <li key={feature.title}>
                      <p className="font-medium">{feature.title}</p>
                      <p className="text-sm text-primary-foreground/80">{feature.body}</p>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="rounded-3xl border border-dashed p-6">
                <h2 className="font-serif text-3xl">Free on-ramp</h2>
                <p className="mt-1 text-sm text-muted-foreground">Limited, on purpose</p>
                <ul className="mt-4 space-y-3">
                  {freeIncludes.map((feature) => (
                    <li key={feature.title}>
                      <p className="font-medium">{feature.title}</p>
                      <p className="text-sm text-muted-foreground">{feature.body}</p>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
            <Link
              href="/start"
              className="mt-6 inline-flex h-12 items-center rounded-full bg-primary px-5 font-medium text-primary-foreground"
            >
              Try it before you upgrade
            </Link>
          </div>
        </section>

        <section id="waitlist" className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-4xl tracking-tight">Want a note when it&apos;s real?</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              The waitlist is the one thing this prototype stores for real. Your email goes into a
              SQLite database on the server and stays there after a refresh.
            </p>
            <dl className="mt-6 space-y-4 text-sm leading-6">
              <div>
                <dt className="font-medium">Is my bank connected?</dt>
                <dd className="text-muted-foreground">
                  No. Account linking is a mock. Production will use Plaid for read-only transactions.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Will you cancel something without asking?</dt>
                <dd className="text-muted-foreground">
                  No. Auto-cancel requests a cancellation and confirms with you before it is final.
                </dd>
              </div>
              <div>
                <dt className="font-medium">What does {PREMIUM_PRICE_LABEL} buy?</dt>
                <dd className="text-muted-foreground">
                  Everything. Auto-cancel, negotiation, instant alerts, all deals, and savings goals.
                  Stripe will bill it later. This demo does not.
                </dd>
              </div>
            </dl>
          </div>
          <WaitlistForm />
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark compact />
          <p className="max-w-md text-sm text-muted-foreground">
            Your Money Life Saver is a clickable prototype. Sample prices, sample bills, no real
            accounts.
          </p>
        </div>
      </footer>
    </div>
  );
}
