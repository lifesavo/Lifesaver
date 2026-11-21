import type { Metadata } from "next";
import { connection } from "next/server";
import { headers } from "next/headers";
import { Suspense } from "react";
import { StartScreen } from "@/components/screens/start-screen";
import { TrialSignupForm, trialErrorMessage } from "@/components/trial-signup-form";
import { incrementEvent } from "@/lib/track";
import { trafficSource } from "@/lib/attribution";

export const metadata: Metadata = {
  title: "Try it free",
  description: "Start a 7-day free trial of LifeSaver Premium. Enter your email, then continue to checkout. 7 days free, then $9.99/month, cancel anytime.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isPrefetch(h: Headers) {
  return (
    h.get("next-router-prefetch") === "1" ||
    h.get("purpose") === "prefetch" ||
    h.get("x-middleware-prefetch") === "1"
  );
}

/** Trial sign-up. GET /start?trial=1 is counted here (prefetch requests are skipped). */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  const isTrial = String(first(params.trial) ?? "") === "1";
  const utmSource = String(first(params.utm_source) ?? "");
  const refCode = String(first(params.ref) ?? "");
  const checkoutCanceled = String(first(params.checkout) ?? "") === "canceled";
  const initialError = String(first(params.error) ?? "");
  if (isTrial) {
    const h = await headers();
    if (!isPrefetch(h)) {
      incrementEvent(
        "trial_start_view",
        trafficSource({ utm_source: utmSource, ref: refCode }),
      );
    }
  }
  const fallback = isTrial ? (
    <TrialSignupForm
      utmSource={utmSource}
      refCode={refCode}
      canceled={checkoutCanceled}
      error={trialErrorMessage(initialError)}
    />
  ) : null;
  return (
    <Suspense fallback={fallback}>
      <StartScreen
        trialDefault={isTrial}
        utmSource={utmSource}
        refCode={refCode}
        checkoutCanceled={checkoutCanceled}
        initialError={initialError}
      />
    </Suspense>
  );
}
