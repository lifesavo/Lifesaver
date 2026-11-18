import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { HandScreen } from "@/components/screens/hand-screen";

export const metadata: Metadata = {
  title: "Lend a Hand",
  description: "Post an odd job and book a sample helper. Included with Lend a Hand at $25.99 a month, or $20.00 for life for founding members.",
};

export default function HandPage() {
  return (
    <AppShell>
      <HandScreen />
    </AppShell>
  );
}
