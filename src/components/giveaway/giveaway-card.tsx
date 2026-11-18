"use client";

import Link from "next/link";
import { Gift } from "lucide-react";
import { formatDeadline, timeLeft, useGiveaway } from "@/components/giveaway/use-giveaway";

export function GiveawayCard({ email }: { email: string }) {
  const { status } = useGiveaway(email);
  return (
    <Link
      href="/giveaway"
      className="relative block overflow-hidden rounded-3xl bg-gradient-to-br from-[#ffb800] via-[#ff4fa3] to-[#7c3aed] px-4 py-4 text-white shadow-lg"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-6 -bottom-8 size-32 rounded-full bg-white/15" />
      <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase">
        <Gift className="size-4" aria-hidden="true" /> Weekly giveaway
      </p>
      <p className="mt-1 font-serif text-2xl leading-tight">$100 every week — free to enter</p>
      {status ? (
        <p className="mt-1 text-sm text-white/90">
          {status.entered ? "You're in this week ✓ · " : "Tap to enter · "}
          Draw {formatDeadline(status.week.closesAt)} · {timeLeft(status.week.closesAt)}
        </p>
      ) : (
        <p className="mt-1 text-sm text-white/90">Drawn every Sunday at 8 PM Central.</p>
      )}
      <p className="mt-2 text-[11px] text-white/80">No purchase necessary. One entry per person. Plan doesn&apos;t matter.</p>
    </Link>
  );
}
