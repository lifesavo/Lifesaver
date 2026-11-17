"use client";

import Link from "next/link";
import { useProfile } from "@/lib/profile";

export function PlanChip() {
  const { profile } = useProfile();
  if (!profile) return null;
  const premium = profile.plan === "premium";
  return (
    <Link
      href="/pricing"
      className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
    >
      {premium ? "Premium demo" : "Free on-ramp"}
    </Link>
  );
}
