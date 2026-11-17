import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PricingScreen } from "@/components/screens/pricing-screen";

export const metadata: Metadata = {
  title: "Premium",
  description: "Everything in Your Money Life Saver, one price, $9.99 a month.",
};

export default function PricingPage() {
  return (
    <AppShell>
      <PricingScreen />
    </AppShell>
  );
}
