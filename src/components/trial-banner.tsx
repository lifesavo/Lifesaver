"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  TRIAL_CANCEL_HINT,
  TRIAL_CARD_REMIND_DAYS,
  TRIAL_DAYS,
  formatTrialEndDate,
  trialDaysRemaining,
  trialDisclosure,
  trialPriceLabel,
} from "@/lib/pricing";
import { useProfile } from "@/lib/profile";

async function openBilling(body: Record<string, unknown>) {
  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as { url?: string; message?: string };
  if (!response.ok || !data.url) throw new Error(data.message || "Checkout didn't open. Try again in a minute.");
  window.location.href = data.url;
}

export function TrialBanner() {
  const params = useSearchParams();
  const { account } = useProfile();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const justStarted = params.get("checkout") === "success";
  const cardAdded = params.get("checkout") === "card_added";
  const trialing = account?.subscriptionStatus === "trialing";
  const trialEnded =
    Boolean(account?.trialEndsAt) &&
    !["active", "trialing", "past_due"].includes(account?.subscriptionStatus || "");
  if (!justStarted && !cardAdded && !trialing && !trialEnded) return null;
  const price = trialPriceLabel(Boolean(account?.founding));
  const daysLeft = trialDaysRemaining(account?.trialEndsAt);
  const endLabel = account?.trialEndsAt ? formatTrialEndDate(account.trialEndsAt) : null;
  const needsCard = Boolean(account) && !account?.hasPaymentMethod;
  const remindSoon = trialing && needsCard && daysLeft !== null && daysLeft <= TRIAL_CARD_REMIND_DAYS;
  const canCollectCard = Boolean(account?.hasBilling);
  const endedNeedsCard = trialEnded && needsCard;

  async function addCard() {
    setError("");
    setPending(true);
    try {
      if (trialing && canCollectCard) await openBilling({ collectCard: true });
      else await openBilling({ plan: "premium" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout didn't open. Try again in a minute.");
      setPending(false);
    }
  }

  const title = endedNeedsCard
    ? `Your ${TRIAL_DAYS}-day free trial has ended.`
    : justStarted
      ? `Your ${TRIAL_DAYS}-day free trial is starting.`
      : cardAdded
        ? "Your card is saved."
        : remindSoon
          ? daysLeft === 0
            ? "Your free trial ends today."
            : `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`
          : `You're on a ${TRIAL_DAYS}-day free trial of Premium.`;

  const body = endedNeedsCard
    ? `Add a card to keep Premium at ${price}/month. Until you do, Premium features are locked and you won't be charged.`
    : cardAdded
      ? `We'll charge ${price}/month when your ${TRIAL_DAYS}-day trial ends${endLabel ? ` on ${endLabel}` : ""}, unless you cancel first. ${TRIAL_CANCEL_HINT}`
      : needsCard
        ? `${trialDisclosure(price)}${endLabel ? ` Your trial ends on ${endLabel}.` : ""} ${TRIAL_CANCEL_HINT}`
        : `${trialDisclosure(price)} ${TRIAL_CANCEL_HINT}`;

  return (
    <section className="rounded-3xl bg-lime px-4 py-4 text-ink" role="status">
      <p className="font-serif text-2xl leading-tight">{title}</p>
      <p className="mt-2 text-sm leading-6">
        {body}{" "}
        <Link href="/settings" className="font-semibold underline">
          Open Settings
        </Link>
        .
      </p>
      {needsCard && (trialing || endedNeedsCard) ? (
        <Button
          type="button"
          className="mt-3 h-11 rounded-full bg-ink px-5 text-white"
          disabled={pending}
          onClick={() => void addCard()}
        >
          {pending ? "Opening checkout…" : "Add a card to keep Premium"}
        </Button>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
