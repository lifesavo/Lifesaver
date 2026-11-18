"use client";

import { useState } from "react";
import Link from "next/link";
import { DemoNote } from "@/components/demo-note";
import { PlanChip } from "@/components/plan-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  bills,
  flagLabel,
  type Bill,
  type BillActionKind,
} from "@/lib/demo-data";
import { money } from "@/lib/money";
import { includesPremium, PREMIUM_PRICE_LABEL } from "@/lib/pricing";
import { useProfile } from "@/lib/profile";

const actionLabel: Record<BillActionKind, string> = {
  cancel: "Cancel for me",
  negotiate: "Negotiate lower",
  remind: "Remind me",
};

const remindChoices = ["Morning of renewal", "1 day before", "3 days before"] as const;

export function BillsScreen() {
  const { profile, setAction, clearAction } = useProfile();
  const [open, setOpen] = useState(false);
  const [billId, setBillId] = useState<string | null>(null);
  const [kind, setKind] = useState<BillActionKind | null>(null);
  const [step, setStep] = useState<"intro" | "confirm" | "done">("confirm");
  const [remind, setRemind] = useState<(typeof remindChoices)[number]>("3 days before");

  if (!profile) return null;

  const bill = bills.find((item) => item.id === billId) ?? null;
  const sorted = [...bills].sort((a, b) => a.renewsOn.localeCompare(b.renewsOn));

  function openAction(nextBill: Bill, nextKind: BillActionKind) {
    setBillId(nextBill.id);
    setKind(nextKind);
    setRemind("3 days before");
    const needsIntro =
      nextKind !== "remind" && !includesPremium(profile?.plan ?? "free");
    setStep(needsIntro ? "intro" : "confirm");
    setOpen(true);
  }

  function confirm() {
    if (!bill || !kind) return;
    const detail =
      kind === "remind"
        ? `${remind} ${bill.renewsLabel.toLowerCase()}.`
        : kind === "cancel"
          ? `Cancellation requested for ${bill.name}.`
          : `Negotiation queued with ${bill.name}.`;
    setAction(bill.id, { kind, detail });
    setStep("done");
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Bills & subscriptions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sorted.length} sample items · renewals, last used, and flags
          </p>
        </div>
        <PlanChip />
      </header>
      <DemoNote>
        Cancel and negotiate are Premium actions ({PREMIUM_PRICE_LABEL}/mo). Reminders are on the
        free on-ramp. Confirmations stay in this browser. Nothing is sent.
      </DemoNote>

      <ul className="space-y-3">
        {sorted.map((item) => {
          const action = profile.actions[item.id];
          return (
            <li key={item.id}>
              <article id={item.id} className="scroll-mt-3 rounded-3xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-medium">{item.name}</h2>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  </div>
                  <p className="text-right">
                    <span className="block font-serif text-2xl leading-none tabular-nums">
                      {money(item.amount)}
                    </span>
                    {item.amountNote && (
                      <span className="mt-1 block text-xs text-muted-foreground">{item.amountNote}</span>
                    )}
                    {item.amount > 0 && item.category !== "Bill" && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {money(item.amount * 12)}/yr
                      </span>
                    )}
                  </p>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-2xl bg-muted px-3 py-2">
                    <dt className="text-xs text-muted-foreground">Renewal</dt>
                    <dd>{item.renewsLabel}</dd>
                  </div>
                  <div className="rounded-2xl bg-muted px-3 py-2">
                    <dt className="text-xs text-muted-foreground">Last used</dt>
                    <dd>{item.lastUsed}</dd>
                  </div>
                </dl>
                {item.flags.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Flags">
                    {item.flags.map((flag) => (
                      <li key={flag}>
                        <Badge
                          variant="outline"
                          className="border-clay/30 bg-[#f8efe6] text-clay"
                        >
                          {flagLabel[flag]}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
                {item.note && <p className="mt-3 text-sm leading-5 text-muted-foreground">{item.note}</p>}

                {action ? (
                  <div className="mt-3 rounded-2xl bg-secondary px-3 py-3" role="status">
                    <p className="text-sm font-medium">
                      {action.kind === "cancel" && "Cancellation requested"}
                      {action.kind === "negotiate" && "Negotiation queued"}
                      {action.kind === "remind" && "Reminder set"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{action.detail} Demo only.</p>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-1 h-10 px-2"
                      onClick={() => clearAction(item.id)}
                    >
                      Undo
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.actions.map((itemAction) => (
                      <Button
                        key={itemAction}
                        type="button"
                        variant={itemAction === "remind" ? "outline" : "secondary"}
                        className="h-10 rounded-full px-3"
                        onClick={() => openAction(item, itemAction)}
                      >
                        {actionLabel[itemAction]}
                      </Button>
                    ))}
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-md">
          {bill && kind && step === "intro" && (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="font-serif text-2xl">That&apos;s part of everything.</DialogTitle>
                <DialogDescription>
                  {kind === "cancel" ? "Auto-cancel" : "Bill negotiation"} is included with Premium
                  for {PREMIUM_PRICE_LABEL} a month — the whole product, not an add-on. Free is only
                  the on-ramp. This demo can still walk the flow.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Button type="button" className="h-12 rounded-full" onClick={() => setStep("confirm")}>
                  Preview the demo
                </Button>
                <Button type="button" variant="outline" className="h-12 rounded-full" asChild>
                  <Link href="/pricing" onClick={() => setOpen(false)}>
                    See Premium
                  </Link>
                </Button>
              </div>
            </>
          )}

          {bill && kind && step === "confirm" && (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="font-serif text-2xl">
                  {kind === "cancel" && `Cancel ${bill.name} for you?`}
                  {kind === "negotiate" && `Ask ${bill.name} for less?`}
                  {kind === "remind" && `Remind you about ${bill.name}?`}
                </DialogTitle>
                <DialogDescription>
                  {kind === "cancel" &&
                    `We'll request the cancellation and pause for your OK before it is final. ${money(bill.amount)} is the sample charge. Nothing is sent to ${bill.name}.`}
                  {kind === "negotiate" &&
                    `We'll ask them to lower ${money(bill.amount)}. People often see about $10 to $20 off a bill like this. Results vary. Nothing is sent.`}
                  {kind === "remind" &&
                    `Pick when to nudge yourself. ${bill.renewsLabel}. No notification leaves this demo.`}
                </DialogDescription>
              </DialogHeader>
              {kind === "remind" && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">When</legend>
                  {remindChoices.map((choice) => (
                    <label key={choice} className="flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm">
                      <input
                        type="radio"
                        name="remind"
                        value={choice}
                        checked={remind === choice}
                        onChange={() => setRemind(choice)}
                        className="size-4 accent-[var(--primary)]"
                      />
                      {choice}
                    </label>
                  ))}
                </fieldset>
              )}
              <div className="flex flex-col gap-2">
                <Button type="button" className="h-12 rounded-full" onClick={confirm}>
                  {kind === "cancel" && "Request cancellation"}
                  {kind === "negotiate" && "Queue negotiation"}
                  {kind === "remind" && "Set reminder"}
                </Button>
                <Button type="button" variant="ghost" className="h-12 rounded-full" onClick={() => setOpen(false)}>
                  Not now
                </Button>
              </div>
            </>
          )}

          {bill && kind && step === "done" && (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="font-serif text-2xl">
                  {kind === "cancel" && "Cancellation requested"}
                  {kind === "negotiate" && "Negotiation queued"}
                  {kind === "remind" && "Reminder set"}
                </DialogTitle>
                <DialogDescription>
                  {kind === "remind"
                    ? `${remind}, tied to ${bill.renewsLabel}. This confirmation stays on the bill. You will not get a notification.`
                    : `The request is saved on ${bill.name}. In the live app we'd confirm with you before anything is final. Nothing was sent.`}
                </DialogDescription>
              </DialogHeader>
              <Button type="button" className="h-12 rounded-full" onClick={() => setOpen(false)}>
                Done
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
