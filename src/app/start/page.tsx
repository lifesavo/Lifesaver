import type { Metadata } from "next";
import { Suspense } from "react";
import { StartScreen } from "@/components/screens/start-screen";

export const metadata: Metadata = {
  title: "Try it free",
  description: "Start a 7-day free trial of LifeSaver Premium. Enter your email and ZIP, then continue to checkout. Cancel anytime before the trial ends and you won't be charged.",
};

export default function StartPage() {
  return (
    <Suspense>
      <StartScreen />
    </Suspense>
  );
}
