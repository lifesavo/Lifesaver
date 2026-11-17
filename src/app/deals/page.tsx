import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { DealsScreen } from "@/components/screens/deals-screen";

export const metadata: Metadata = { title: "Deals" };

export default function DealsPage() {
  return (
    <AppShell>
      <DealsScreen />
    </AppShell>
  );
}
