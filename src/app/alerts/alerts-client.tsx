"use client";

import { AlertsScreen } from "@/components/alerts";
import { useProfile } from "@/lib/profile";

export function AlertsPageClient() {
  const { profile } = useProfile();
  if (!profile) return null;
  return <AlertsScreen zip={profile.zip} />;
}
