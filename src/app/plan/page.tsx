import { Suspense } from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PlanScreen } from "@/components/screens/plan-screen";

export const metadata: Metadata = {
  title: "Trip planner",
  description: "Tell LifeSaver where you're going and get a day-by-day itinerary, a budget split, a packing list, and calendar events. Free.",
};

export default function PlanPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <PlanScreen />
      </Suspense>
    </AppShell>
  );
}
