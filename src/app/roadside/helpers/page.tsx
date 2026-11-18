import type { Metadata } from "next";
import { PhoneFrame } from "@/components/phone-frame";
import { HelpersScreen } from "@/components/roadside/helpers-screen";

export const metadata: Metadata = {
  title: "Roadside requests near you",
  description: "Lend a Hand members can see and accept nearby roadside help requests.",
};

export default function RoadsideHelpersPage() {
  return (
    <PhoneFrame>
      <HelpersScreen />
    </PhoneFrame>
  );
}
