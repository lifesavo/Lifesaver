"use client";

import { useCallback, useEffect, useState } from "react";

export type GiveawayStatus = {
  week: { key: string; opensAt: string; closesAt: string; closedNow: boolean };
  entered: boolean;
  entrants: number;
  lastWinner: string | null;
};

export function useGiveaway(email: string) {
  const [status, setStatus] = useState<GiveawayStatus | null>(null);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const query = email ? `?email=${encodeURIComponent(email)}` : "";
      const response = await fetch(`/api/giveaway${query}`);
      if (!response.ok) throw new Error("giveaway");
      setStatus((await response.json()) as GiveawayStatus);
      setError(false);
    } catch {
      setError(true);
    }
  }, [email]);

  useEffect(() => {
    let cancelled = false;
    const query = email ? `?email=${encodeURIComponent(email)}` : "";
    fetch(`/api/giveaway${query}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("giveaway");
        return (await response.json()) as GiveawayStatus;
      })
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [email]);

  return { status, error, refresh };
}

export function formatDeadline(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function timeLeft(iso: string, now = Date.now()) {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "Drawing now";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m left`;
}
