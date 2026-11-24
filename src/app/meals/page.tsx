import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { MealsScreen } from "@/components/screens/meals-screen";

export const metadata: Metadata = {
  title: "Meals",
  description:
    "Weekly meal planner: breakfast, lunch, and dinner for Monday to Sunday from your own saved meals, copy last week in one tap, and send the week's ingredients to your Grocery list. Free, no sign-up, saved on your phone.",
};

export default function MealsPage() {
  return (
    <AppShell>
      <MealsScreen />
    </AppShell>
  );
}
