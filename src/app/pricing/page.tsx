import type { Metadata } from "next";
import { connection } from "next/server";
import { AppShell } from "@/components/app-shell";
import { PricingScreen } from "@/components/screens/pricing-screen";
import { billingOpen } from "@/lib/billing-config";

export const metadata: Metadata = {
  title: "Plans",
  description: "Founding members lock in Premium at $7.99/mo for life (regular $9.99) and Lend a Hand at $14.99/mo for life (regular $19.99).",
};

export default async function PricingPage() {
  await connection();
  return (
    <AppShell>
      <PricingScreen billingOpen={billingOpen()} />
    </AppShell>
  );
}
