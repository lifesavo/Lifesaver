import { Suspense } from "react";
import type { Metadata } from "next";
import { PhoneFrame } from "@/components/phone-frame";
import { HelpersScreen } from "@/components/help/helpers-board";

export const metadata: Metadata = {
  title: "Helper board",
  description: "Lend a Hand members: see nearby roadside, ride, and home-help requests and accept one.",
};

export default function HelpersPage() {
  return (
    <PhoneFrame>
      <Suspense fallback={null}>
        <HelpersScreen />
      </Suspense>
    </PhoneFrame>
  );
}
