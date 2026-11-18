import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { TravelScreen } from "@/components/screens/travel-screen";

export const metadata: Metadata = {
  title: "Travel",
  description: "Cheapest flights, hotels, and cars for Lend a Hand members. Example prices are labeled until a live feed is connected.",
};

export default function TravelPage() {
  return (
    <AppShell>
      <TravelScreen />
    </AppShell>
  );
}
