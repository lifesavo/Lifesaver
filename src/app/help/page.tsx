import { Suspense } from "react";
import type { Metadata } from "next";
import { PhoneFrame } from "@/components/phone-frame";
import { HelpScreen } from "@/components/help/help-screen";

export const metadata: Metadata = {
  title: "Get a Hand",
  description: "Ask nearby Lend a Hand members for a ride, help at home or work, or roadside help, and see when someone accepts.",
};

export default function HelpPage() {
  return (
    <PhoneFrame>
      <Suspense fallback={null}>
        <HelpScreen />
      </Suspense>
    </PhoneFrame>
  );
}
