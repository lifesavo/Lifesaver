import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { BudgetScreen } from "@/components/screens/budget-screen";

export const metadata: Metadata = {
  title: "Budget",
  description:
    "A simple monthly budget: set what you want to spend per category, log what you spend in two taps, and see what's left. Free, no sign-up, saved on your phone.",
};

export default function BudgetPage() {
  return (
    <AppShell>
      <BudgetScreen />
    </AppShell>
  );
}
