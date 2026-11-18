"use client";

import Link from "next/link";
import { useProfile } from "@/lib/profile";

export function PlanChip() {
  const { profile } = useProfile();
  if (!profile) return null;
  const label =
    profile.plan === "hand" ? "Lend a Hand" : profile.plan === "premium" ? "Premium" : "Free";
  return (
    <Link
      href="/pricing"
      className="shrink-0 -rotate-2 rounded-full bg-lime px-3 py-1.5 text-xs font-bold text-ink"
    >
      {label}
    </Link>
  );
}
