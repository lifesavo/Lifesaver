import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Weekly Giveaway Official Rules",
  description: "Official Rules for the LifeSaver $100 Weekly Giveaway. No purchase necessary.",
};

export default function GiveawayRulesRedirect() {
  redirect("/giveaway-rules");
}
