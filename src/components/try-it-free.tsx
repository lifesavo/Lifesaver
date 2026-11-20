"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BeaconEvent } from "@/lib/track";
import { trialStartPath } from "@/lib/attribution";

function currentSearch() {
  if (typeof window === "undefined") return "";
  return window.location.search;
}

function sendBeacon(event: BeaconEvent) {
  const params = new URLSearchParams(currentSearch());
  const body = JSON.stringify({
    event,
    utm_source: params.get("utm_source") ?? undefined,
    ref: params.get("ref") ?? undefined,
  });
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const sent = navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      if (sent) return;
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Counting must never block opening the trial page.
  }
}

/** Landing-page "Try it free" link: keeps utm_source/ref and records a first-party click. */
export function TryItFreeLink({
  event,
  className,
  children,
}: {
  event: BeaconEvent;
  className?: string;
  children: React.ReactNode;
}) {
  const [href, setHref] = useState("/start?trial=1");
  useEffect(() => {
    setHref(trialStartPath(window.location.search));
  }, []);

  return (
    <Link href={href} prefetch={false} className={className} onClick={() => sendBeacon(event)}>
      {children}
    </Link>
  );
}
