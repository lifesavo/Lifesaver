import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PricingScreen } from "@/components/screens/pricing-screen";

export const metadata: Metadata = {
  title: "Premium",
  description: "Premium is $7.99 for life on the waitlist, then $9.99. Lend a Hand is $20.00 for life, then $24.99.",
};

export default function PricingPage() {
  return (
    <AppShell>
      <PricingScreen />
    </AppShell>
  );
}
