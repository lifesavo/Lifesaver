import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { GroceryScreen } from "@/components/screens/grocery-screen";

export const metadata: Metadata = {
  title: "Grocery list",
  description:
    "A simple grocery list that checks off as you shop, with optional price compare between the stores you use. Saved in your browser. Free.",
};

export default function GroceryPage() {
  return (
    <AppShell>
      <GroceryScreen />
    </AppShell>
  );
}
