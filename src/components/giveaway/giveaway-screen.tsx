"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Gift, Trophy } from "lucide-react";
import { GiveawayEntryForm } from "@/components/giveaway/entry-form";
import { formatDeadline, timeLeft, useGiveaway } from "@/components/giveaway/use-giveaway";
import { useProfile } from "@/lib/profile";

export function GiveawayScreen() {
  const { profile } = useProfile();
  const [email, setEmail] = useState(profile?.email ?? "");
  const lookupEmail = email || profile?.email || "";
  const { status, error, refresh } = useGiveaway(lookupEmail);
  const [message, setMessage] = useState("");

  function entered(already: boolean, enteredEmail?: string) {
    if (enteredEmail) setEmail(enteredEmail);
    setMessage(
      already
        ? "You were already in this week. One entry per person, so you're all set."
        : "You're in! Good luck. Come back next Monday to enter the new week.",
    );
    void refresh();
  }

  return (
    <div className="space-y-5">
      <Link href={profile ? "/home" : "/"} className="inline-flex items-center gap-1 text-sm font-medium text-primary">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back
      </Link>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#ffb800] via-[#ff4fa3] to-[#7c3aed] px-5 py-6 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-white/15" />
        <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase">
          <Gift className="size-4" aria-hidden="true" /> LifeSaver Weekly Giveaway
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight">One winner gets $100 every week — free to enter</h1>
        <p className="mt-2 text-sm leading-6 text-white/90">
          One winner, drawn at random every Sunday at 8 PM Central. Everyone gets the same single entry.
        </p>
        {status && (
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl bg-white/15 px-3 py-2">
              <dt className="text-xs text-white/80">This week closes</dt>
              <dd className="font-semibold">{formatDeadline(status.week.closesAt)}</dd>
              <dd className="text-xs text-white/80">{timeLeft(status.week.closesAt)}</dd>
            </div>
            <div className="rounded-2xl bg-white/15 px-3 py-2">
              <dt className="text-xs text-white/80">Your entries this week</dt>
              <dd className="font-serif text-3xl">{status.entered ? 1 : 0}</dd>
              <dd className="text-xs text-white/80">{status.entered ? "You're in ✓" : lookupEmail ? "Not entered yet" : "Enter below"}</dd>
            </div>
          </dl>
        )}
        {error && <p className="mt-3 text-sm">Couldn&apos;t load this week&apos;s details. Pull to refresh.</p>}
      </section>

      {status?.lastWinner && (
        <p className="flex items-center gap-2 rounded-2xl bg-sun px-4 py-3 text-sm font-semibold text-ink">
          <Trophy className="size-4" aria-hidden="true" /> Last week&apos;s winner: {status.lastWinner}
        </p>
      )}

      <section aria-labelledby="how-heading" className="rounded-3xl border bg-card px-4 py-4">
        <h2 id="how-heading" className="font-serif text-2xl tracking-tight">How it works</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6">
          <li>Enter once each week with your name and email. That&apos;s your one entry.</li>
          <li>Entries close Sunday at 8 PM Central. A new week opens Monday at 12 AM.</li>
          <li>We draw one winner at random. Every entry has the same chance.</li>
          <li>We email the winner. Reply within 72 hours to claim your $100.</li>
        </ol>
        <p className="mt-3 rounded-2xl bg-lime px-3 py-2 text-xs leading-5 text-ink">
          <strong>No purchase necessary.</strong> Free, Premium, and Lend a Hand members all get exactly one entry.
          Paying never adds entries or improves your odds.
        </p>
      </section>

      <section aria-labelledby="enter-heading" className="space-y-3">
        <h2 id="enter-heading" className="font-serif text-2xl tracking-tight">
          {status?.entered ? "You're entered this week" : "Enter this week"}
        </h2>
        {message && (
          <p role="status" className="rounded-2xl bg-cyan px-3 py-2 text-sm font-semibold text-ink">
            {message}
          </p>
        )}
        {!status?.entered && (
          <GiveawayEntryForm
            method="app"
            defaultEmail={profile?.email ?? ""}
            submitLabel="Enter for $100"
            key={profile?.email ?? "guest"}
            onEntered={entered}
          />
        )}
      </section>

      <details className="rounded-3xl border bg-card px-4 py-3">
        <summary className="cursor-pointer font-semibold">Alternative free entry</summary>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          No app, no account, no waitlist signup needed. This entry counts exactly the same as any other entry:
          one per person per week.
        </p>
        <div className="mt-3">
          <AmoeForm onEntered={entered} />
        </div>
      </details>

      <p className="text-xs leading-5 text-muted-foreground">
        NO PURCHASE NECESSARY. A purchase will not increase your chances of winning. Open to legal U.S. residents 18+.
        Void where prohibited. Odds depend on the number of eligible entries. This is a free promotional sweepstakes,
        not a game of chance you pay to play. Not sponsored by or affiliated with TikTok, Meta, Apple, or Google.{" "}
        <Link href="/giveaway-rules" className="font-semibold text-primary underline">
          Official Rules
        </Link>
      </p>
    </div>
  );
}

function AmoeForm({ onEntered }: { onEntered: (already: boolean, email: string) => void }) {
  return <GiveawayEntryForm method="amoe" submitLabel="Submit free entry" onEntered={onEntered} />;
}
