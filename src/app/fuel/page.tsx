import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { FuelScreen } from "@/components/screens/fuel-screen";

export const metadata: Metadata = {
  title: "Fuel",
  description: "Cheapest gas near you. Live prices when Google has them, otherwise real stations with estimated prices labeled as estimates.",
};

export default function FuelPage() {
  return (
    <AppShell>
      <FuelScreen />
    </AppShell>
  );
}
