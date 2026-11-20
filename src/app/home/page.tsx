import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { HomeScreen } from "@/components/screens/home-screen";

export const metadata: Metadata = { title: "Home" };

export default function HomeRoute() {
  return (
    <AppShell>
      <Suspense>
        <HomeScreen />
      </Suspense>
    </AppShell>
  );
}
