import { Suspense } from "react";
import type { Metadata } from "next";
import { PhoneFrame } from "@/components/phone-frame";
import { RoadsideScreen } from "@/components/roadside/roadside-screen";

export const metadata: Metadata = {
  title: "Roadside Help",
  description: "Flat tire, breakdown, out of gas, locked out, dead battery, or an accident: safety steps, your location, nearby tow and fuel links, and nearby Lend a Hand helpers.",
};

export default function RoadsidePage() {
  return (
    <PhoneFrame>
      <Suspense fallback={null}>
        <RoadsideScreen />
      </Suspense>
    </PhoneFrame>
  );
}
