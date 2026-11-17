import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { HomeScreen } from "@/components/screens/home-screen";

export const metadata: Metadata = { title: "Home" };

export default function HomeRoute() {
  return (
    <AppShell>
      <HomeScreen />
    </AppShell>
  );
}
