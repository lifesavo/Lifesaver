import type { Metadata } from "next";
import { Suspense } from "react";
import { StartScreen } from "@/components/screens/start-screen";

export const metadata: Metadata = {
  title: "Get started",
  description: "Sign up with your email and ZIP code. Free to start.",
};

export default function StartPage() {
  return (
    <Suspense>
      <StartScreen />
    </Suspense>
  );
}
