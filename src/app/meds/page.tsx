import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { MedsScreen } from "@/components/screens/meds-screen";

export const metadata: Metadata = {
  title: "Meds",
  description:
    "Medicine and vitamin reminders: a daily checklist of doses, tap when taken, refill heads-up before you run out, and daily alarms in your phone's calendar. Free, no sign-up, saved on your phone.",
};

export default function MedsPage() {
  return (
    <AppShell>
      <MedsScreen />
    </AppShell>
  );
}
