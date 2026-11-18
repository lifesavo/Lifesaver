"use client";

import { WeatherScreen } from "@/components/weather-card";
import { useProfile } from "@/lib/profile";

export function WeatherPageClient() {
  const { profile } = useProfile();
  if (!profile) return null;
  return <WeatherScreen zip={profile.zip} />;
}
