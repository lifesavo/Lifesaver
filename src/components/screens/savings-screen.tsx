"use client";

import Link from "next/link";
import { DemoNote } from "@/components/demo-note";
import { PlanChip } from "@/components/plan-chip";
import { Progress } from "@/components/ui/progress";
import {
  DEMO_AS_OF,
  goals,
  ledger,
  MONTH_SAVED,
  savingsHistory,
  YEAR_SAVED,
} from "@/lib/demo-data";
import { money } from "@/lib/money";
import { PREMIUM_PRICE_LABEL } from "@/lib/pricing";
import { useProfile } from "@/lib/profile";

const maxMonth = Math.max(...savingsHistory.map((month) => month.amount));

export function SavingsScreen() {
  const { profile } = useProfile();
  if (!profile) return null;
  const premium = profile.plan === "premium";

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Savings</h1>
          <p className="mt-1 text-sm text-muted-foreground">History and goals through {DEMO_AS_OF}</p>
        </div>
        <PlanChip />
      </header>
      <DemoNote>
        A sample year, not your accounts. Savings goals unlock with Premium ({PREMIUM_PRICE_LABEL}
        /mo). {premium ? "You're previewing them now." : "The bars below are a preview of the real screen."}
      </DemoNote>

      <section aria-labelledby="history-heading" className="rounded-3xl border bg-card p-4">
        <h2 id="history-heading" className="font-serif text-2xl tracking-tight">
          {money(YEAR_SAVED)} kept
        </h2>
        <p className="text-sm text-muted-foreground">June through November, sample year</p>
        <div className="mt-4 flex h-32 items-end gap-2" aria-hidden="true">
          {savingsHistory.map((month) => (
            <div key={month.month} className="flex h-full flex-1 items-end">
              <div
                className={
                  month.month === "Nov"
                    ? "w-full rounded-t-lg bg-primary"
                    : "w-full rounded-t-lg bg-primary/45"
                }
                style={{ height: `${Math.max(12, (month.amount / maxMonth) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          {savingsHistory.map((month) => (
            <div key={month.month} className="flex-1 text-center">
              <p className="text-[11px] text-muted-foreground">{month.month}</p>
              <p className="sr-only">
                {month.month}: {money(month.amount)}
              </p>
            </div>
          ))}
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {savingsHistory.map((month) => (
            <li key={month.month} className="flex justify-between gap-3">
              <span className="text-muted-foreground">{month.month}</span>
              <span className="tabular-nums">{money(month.amount)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ledger-heading" className="space-y-2">
        <h2 id="ledger-heading" className="font-serif text-2xl tracking-tight">
          This month
        </h2>
        <p className="text-sm text-muted-foreground">{money(MONTH_SAVED)} in the November sample.</p>
        <ul className="overflow-hidden rounded-2xl border bg-card">
          {ledger.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0">
              <span className="text-sm">{row.label}</span>
              <span className="text-sm font-medium tabular-nums">{money(row.amount)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="goals-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 id="goals-heading" className="font-serif text-2xl tracking-tight">
            Goals
          </h2>
          <p className="text-xs font-semibold text-primary">Premium</p>
        </div>
        {!premium && (
          <Link href="/pricing" className="block rounded-2xl bg-secondary px-4 py-3 text-sm leading-6">
            Goals are part of everything for {PREMIUM_PRICE_LABEL}/mo. You can still read this sample.
            Unlock the real ones with Premium.
          </Link>
        )}
        <ul className="space-y-3">
          {goals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100));
            return (
              <li key={goal.id} className="rounded-3xl border bg-card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium">{goal.name}</h3>
                  <p className="text-sm tabular-nums">
                    {money(goal.saved)} <span className="text-muted-foreground">of {money(goal.target)}</span>
                  </p>
                </div>
                <Progress value={pct} className="mt-3" aria-label={`${goal.name}, ${pct} percent`} />
                <p className="mt-2 text-sm text-muted-foreground">{goal.detail}</p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
