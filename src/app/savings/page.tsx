import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { SavingsScreen } from "@/components/screens/savings-screen";

export const metadata: Metadata = { title: "Savings" };

export default function SavingsPage() {
  return (
    <AppShell>
      <SavingsScreen />
    </AppShell>
  );
}
