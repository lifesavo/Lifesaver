import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PricingScreen } from "@/components/screens/pricing-screen";

export const metadata: Metadata = {
  title: "Premium",
  description: "Premium is $9.99 a month. Lend a Hand is $29.99 and includes Premium plus helpers.",
};

export default function PricingPage() {
  return (
    <AppShell>
      <PricingScreen />
    </AppShell>
  );
}
