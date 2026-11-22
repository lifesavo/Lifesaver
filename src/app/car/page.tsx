import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { CarScreen } from "@/components/screens/car-screen";

export const metadata: Metadata = {
  title: "Car care",
  description:
    "Track oil changes, tire rotations, filters, and more by miles or months. See what's due next, log what you spent, and add reminders to your calendar. Free, no sign-up, saved on your phone.",
};

export default function CarPage() {
  return (
    <AppShell>
      <CarScreen />
    </AppShell>
  );
}
