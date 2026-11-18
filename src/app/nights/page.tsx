import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { NightsScreen } from "@/components/screens/nights-screen";

export const metadata: Metadata = {
  title: "Nights",
  description: "Monthly Girls' Night Out and Guys' Night Out. Coming soon until a real event is posted.",
};

export default function NightsPage() {
  return (
    <AppShell>
      <NightsScreen />
    </AppShell>
  );
}
