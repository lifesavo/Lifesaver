import type { Metadata } from "next";
import { connection } from "next/server";
import { headers } from "next/headers";
import { Suspense } from "react";
import { StartScreen } from "@/components/screens/start-screen";
import { incrementEvent } from "@/lib/track";
import { trafficSource } from "@/lib/attribution";

export const metadata: Metadata = {
  title: "Try it free",
  description: "Start a 7-day free trial of LifeSaver Premium. Enter your email and ZIP, then continue to checkout. Cancel anytime before your trial ends and you won't be charged.",
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
  if (String(first(params.trial) ?? "") === "1") {
    const h = await headers();
    if (!isPrefetch(h)) {
      incrementEvent(
        "trial_start_view",
        trafficSource({ utm_source: first(params.utm_source), ref: first(params.ref) }),
      );
    }
  }
  return (
    <Suspense>
      <StartScreen />
    </Suspense>
  );
}
