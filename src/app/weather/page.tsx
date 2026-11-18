import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { WeatherPageClient } from "@/app/weather/weather-client";

export const metadata: Metadata = {
  title: "What to wear",
  description: "Today's weather turned into an outfit: jacket or T-shirt, shorts or pants, boots or sandals, and an umbrella if you need one.",
};

export default function WeatherPage() {
  return (
    <AppShell>
      <WeatherPageClient />
    </AppShell>
  );
}
