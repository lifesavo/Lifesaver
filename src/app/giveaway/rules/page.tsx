import type { Metadata } from "next";
import Link from "next/link";
import { PhoneFrame } from "@/components/phone-frame";

export const metadata: Metadata = {
  title: "Weekly Giveaway Official Rules",
  description: "Official Rules for the LifeSaver $100 Weekly Giveaway. No purchase necessary.",
};

// Jason: replace this placeholder with the sponsor's legal entity name and
// mailing address before promoting the giveaway.
const SPONSOR = "[SPONSOR LEGAL NAME & ADDRESS]";

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="font-serif text-xl tracking-tight">
        {n}. {title}
      </h2>
      <div className="space-y-2 text-sm leading-6">{children}</div>
    </section>
  );
}

export default function GiveawayRulesPage() {
  return (
    <PhoneFrame>
      <article className="space-y-5">
        <Link href="/giveaway" className="text-sm font-medium text-primary">
          ← Back to the giveaway
        </Link>
        <header>
          <p className="text-xs font-bold tracking-wide text-primary uppercase">LifeSaver $100 Weekly Giveaway</p>
          <h1 className="font-serif text-3xl tracking-tight">Official Rules</h1>
        </header>

        <p className="rounded-2xl bg-sun px-4 py-3 text-sm font-semibold leading-6 text-ink">
          NO PURCHASE OR PAYMENT OF ANY KIND IS NECESSARY TO ENTER OR WIN. A PURCHASE OR PAID MEMBERSHIP WILL NOT
          INCREASE YOUR CHANCES OF WINNING. VOID WHERE PROHIBITED.
        </p>
        <p className="text-sm leading-6">
          This is a free promotional sweepstakes. No consideration is required, and everyone who enters has the same
          single chance. It is not a game anyone pays to play.
        </p>

        <Section n={1} title="Sponsor">
          <p>
            The LifeSaver $100 Weekly Giveaway (the &ldquo;Giveaway&rdquo;) is sponsored by LifeSaver, {SPONSOR}
            (&ldquo;Sponsor&rdquo;).
          </p>
        </Section>

        <Section n={2} title="Eligibility">
          <p>
            Open only to legal residents of the 50 United States and the District of Columbia who are 18 years of age
            or older (or the age of majority in their state, if higher) at the time of entry. Employees of Sponsor and
            their immediate family and household members are not eligible. Void where prohibited or restricted by law.
          </p>
        </Section>

        <Section n={3} title="Entry period">
          <p>
            The Giveaway runs in weekly entry periods. Each entry period begins Monday at 12:00 AM Central Time and
            ends Sunday at 8:00 PM Central Time (America/Chicago). Entries received between Sunday 8:00 PM and Monday
            12:00 AM count toward the next entry period. Sponsor&apos;s server clock is the official timekeeper.
          </p>
        </Section>

        <Section n={4} title="How to enter">
          <p>
            <strong>Online entry:</strong> Visit the LifeSaver giveaway page (/giveaway), enter your first name, last
            initial, and email address, confirm your eligibility, and submit.
          </p>
          <p>
            <strong>Alternative free entry:</strong> Anyone may enter without using the app, creating an account, or
            joining the waitlist by completing the &ldquo;Alternative free entry&rdquo; form on the giveaway page. An
            alternative entry has exactly the same value and chance of winning as any other entry.
          </p>
          <p>
            <strong>Limit:</strong> One (1) entry per person and per email address per weekly entry period, regardless
            of entry method. Membership plan (Free, Premium, or Lend a Hand) has no effect on entries or odds. Entries
            do not carry over; you must enter again each week. Use of multiple email addresses, aliases, scripts, or
            automated means to enter more than once is prohibited and may result in disqualification of all entries.
          </p>
        </Section>

        <Section n={5} title="Drawing and odds">
          <p>
            One (1) winner will be selected in a random drawing from all eligible entries received during each entry
            period, conducted on or about the Sunday the period closes. Each eligible entry has an equal chance of being
            selected. Odds of winning depend on the number of eligible entries received for that period.
          </p>
        </Section>

        <Section n={6} title="Prize">
          <p>
            One (1) prize per entry period: $100 USD, paid by PayPal, Venmo, or Cash App, or as a $100 gift card, at
            Sponsor&apos;s choice in consultation with the winner. Approximate retail value (ARV): $100. Prize is not
            transferable. No substitution except by Sponsor if the stated prize is unavailable, in which case a prize
            of equal or greater value will be awarded.
          </p>
        </Section>

        <Section n={7} title="Winner notification">
          <p>
            The potential winner will be notified by email at the address used to enter. The potential winner must
            respond within 72 hours of notification and may be required to confirm eligibility and identity. If the
            potential winner does not respond within 72 hours, is found ineligible, or does not comply with these
            rules, the prize will be forfeited and an alternate winner will be drawn from the remaining eligible entries
            for that period.
          </p>
        </Section>

        <Section n={8} title="Taxes">
          <p>
            The winner is solely responsible for all federal, state, and local taxes on the prize. Sponsor may request
            tax information where required by law.
          </p>
        </Section>

        <Section n={9} title="Publicity">
          <p>
            Except where prohibited, Sponsor may display the winner&apos;s first name and last initial (for example,
            &ldquo;Taylor R.&rdquo;) on the LifeSaver giveaway page.
          </p>
        </Section>

        <Section n={10} title="Privacy">
          <p>
            Information you submit is used to administer the Giveaway, contact the winner, and prevent duplicate or
            fraudulent entries. We do not sell your information. Entering the Giveaway does not sign you up for paid
            services.
          </p>
        </Section>

        <Section n={11} title="General conditions">
          <p>
            Sponsor may disqualify any person who tampers with the entry process or violates these rules, and may
            cancel, modify, or suspend the Giveaway if fraud, technical failure, or other causes beyond its control
            affect its fairness or administration. By entering, participants release Sponsor from liability for any
            injury or loss related to participation or the prize, to the extent permitted by law.
          </p>
        </Section>

        <Section n={12} title="Not affiliated with platforms">
          <p>
            This Giveaway is in no way sponsored, endorsed, administered by, or associated with TikTok, Meta (Facebook
            or Instagram), Apple, or Google. Participants release those companies from any liability related to the
            Giveaway.
          </p>
        </Section>

        <Section n={13} title="Winners list">
          <p>
            For the name of a weekly winner, see the giveaway page or contact Sponsor at the address above within 60
            days after the drawing.
          </p>
        </Section>
      </article>
    </PhoneFrame>
  );
}
