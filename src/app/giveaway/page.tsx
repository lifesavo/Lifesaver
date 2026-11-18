import type { Metadata } from "next";
import { PhoneFrame } from "@/components/phone-frame";
import { GiveawayScreen } from "@/components/giveaway/giveaway-screen";

export const metadata: Metadata = {
  title: "$100 Weekly Giveaway",
  description: "$100 every week, free to enter. One entry per person. Drawn every Sunday at 8 PM Central.",
};

export default function GiveawayPage() {
  return (
    <PhoneFrame>
      <GiveawayScreen />
    </PhoneFrame>
  );
}
