import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { OpenScreen } from "@/components/screens/open-screen";

export const metadata: Metadata = {
  title: "Open near me",
  description:
    "What's open right now near you: groceries, pharmacy, gas, food, coffee, hardware, clinics and more, sorted by distance with today's hours, call and directions. Free, from OpenStreetMap, no account needed.",
};

export default function OpenPage() {
  return (
    <AppShell>
      <OpenScreen />
    </AppShell>
  );
}
