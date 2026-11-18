import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { AlertsPageClient } from "@/app/alerts/alerts-client";

export const metadata: Metadata = {
  title: "Weather alerts",
  description: "Active National Weather Service watches, warnings, and advisories for where you are and where you're going.",
};

export default function AlertsPage() {
  return (
    <AppShell>
      <AlertsPageClient />
    </AppShell>
  );
}
