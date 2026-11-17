import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { BillsScreen } from "@/components/screens/bills-screen";

export const metadata: Metadata = { title: "Bills" };

export default function BillsPage() {
  return (
    <AppShell>
      <BillsScreen />
    </AppShell>
  );
}
