"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TRIAL_CANCEL_HINT, trialDisclosure, trialPriceLabel } from "@/lib/pricing";
import { useProfile } from "@/lib/profile";

export function TrialBanner() {
  const params = useSearchParams();
  const { account } = useProfile();
  const justStarted = params.get("checkout") === "success";
  const trialing = account?.subscriptionStatus === "trialing";
  if (!justStarted && !trialing) return null;
  const price = trialPriceLabel(Boolean(account?.founding));
  return (
    <section className="rounded-3xl bg-lime px-4 py-4 text-ink" role="status">
      <p className="font-serif text-2xl leading-tight">
        {justStarted ? "Your 7-day free trial is starting." : "You're on a 7-day free trial of Premium."}
      </p>
      <p className="mt-2 text-sm leading-6">
        {trialDisclosure(price)} {TRIAL_CANCEL_HINT}{" "}
        <Link href="/settings" className="font-semibold underline">
          Open Settings
        </Link>
        .
      </p>
    </section>
  );
}
