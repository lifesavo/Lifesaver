import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PackagesScreen } from "@/components/screens/packages-screen";

export const metadata: Metadata = {
  title: "Packages",
  description:
    "Every package in one list: paste a tracking number, LifeSaver spots UPS, USPS, FedEx, DHL, OnTrac or Amazon and opens the carrier's official tracking page in one tap. Expected dates, delivery-day reminders, saved on your phone.",
};

export default function PackagesPage() {
  return (
    <AppShell>
      <PackagesScreen />
    </AppShell>
  );
}
