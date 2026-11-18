import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { RidesScreen } from "@/components/screens/rides-screen";

export const metadata: Metadata = {
  title: "Rides",
  description: "Compare sample Uber and Lyft fares and open their public apps. Not an official partnership.",
};

export default function RidesPage() {
  return (
    <AppShell>
      <RidesScreen />
    </AppShell>
  );
}
