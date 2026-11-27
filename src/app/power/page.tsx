import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PowerScreen } from "@/components/screens/power-screen";

export const metadata: Metadata = {
  title: "Power saver",
  description:
    "Cut your electric bill: see what each appliance really costs at your rate, check off money-saving habits, and watch your estimated yearly savings add up. Saved on your phone, no account needed.",
};

export default function PowerPage() {
  return (
    <AppShell>
      <PowerScreen />
    </AppShell>
  );
}
