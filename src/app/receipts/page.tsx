import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ReceiptsScreen } from "@/components/screens/receipts-screen";

export const metadata: Metadata = {
  title: "Receipts",
  description:
    "Log shopping trips, snap the receipt in Fetch for points, and keep a running total of receipt rewards you record. Free, no sign-up, saved on your phone. LifeSaver is not affiliated with Fetch.",
};

export default function ReceiptsPage() {
  return (
    <AppShell>
      <ReceiptsScreen />
    </AppShell>
  );
}
