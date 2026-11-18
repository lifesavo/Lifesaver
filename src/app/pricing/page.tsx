import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PricingScreen } from "@/components/screens/pricing-screen";

export const metadata: Metadata = {
  title: "Premium",
  description: "Premium is $7.99 for life on the waitlist, then $9.99. Lend a Hand is $14.99 for life, then $19.99. Helping others and earning is included with Lend a Hand.",
};

export default function PricingPage() {
  return (
    <AppShell>
      <PricingScreen />
    </AppShell>
  );
}
