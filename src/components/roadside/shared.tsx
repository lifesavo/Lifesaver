"use client";

import { useCallback, useEffect, useState } from "react";
import { ROADSIDE, type RoadsideIssue } from "@/lib/roadside/info";

export type Spot = { lat: number; lng: number; accuracy: number | null };

export const ISSUE_EMOJI: Record<RoadsideIssue, string> = {
  flat_tire: "🛞",
  breakdown: "🚗",
  out_of_gas: "⛽",
  lockout: "🔑",
  jump_start: "🔋",
  accident: "🚨",
  wont_start: "🚗",
};

export function issueLabel(issue: string) {
  return ROADSIDE[issue as RoadsideIssue]?.label ?? issue;
}

export function useSpot(auto = true) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [status, setStatus] = useState("Finding your location…");
  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("This browser can't share location. Describe where you are in the note.");
      return;
    }
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setSpot({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy ?? null });
        setStatus("Location found.");
      },
      () => setStatus("Location is blocked. Turn it on in your browser settings, or describe where you are (highway, mile marker, exit)."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, []);
  useEffect(() => {
    if (auto) queueMicrotask(locate);
  }, [auto, locate]);
  return { spot, status, locate };
}

export function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function nearLink(what: string, spot: Spot | null) {
  return spot
    ? `https://www.google.com/maps/search/${encodeURIComponent(what)}/@${spot.lat.toFixed(5)},${spot.lng.toFixed(5)},13z`
    : `https://www.google.com/maps/search/${encodeURIComponent(`${what} near me`)}`;
}

export function directionsLink(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function ago(sqlTime: string) {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(`${sqlTime.replace(" ", "T")}Z`)) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} hr ago`;
}

export type RoadsideRequestView = {
  id: string;
  issue: string;
  status: "open" | "accepted" | "done" | "cancelled";
  note: string | null;
  createdAt: string;
  acceptedAt: string | null;
  lat: number;
  lng: number;
  exact: boolean;
  role: "requester" | "helper" | "viewer";
  requester?: { name: string; phone: string };
  helper?: { name: string; phone: string } | null;
  expired: boolean;
  miles?: number;
};

export const COMMUNITY_NOTE =
  "Lend a Hand helpers are LifeSaver community members, not professionals. Nobody is guaranteed to answer, and LifeSaver does not dispatch tow trucks or mechanics. Keep calling a tow or 911 if you need to.";

export function Call911({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="tel:911"
      className={`flex items-center justify-center gap-2 rounded-full bg-[#dc2626] font-bold text-white shadow-[4px_4px_0_#2a1038] ${compact ? "h-11 px-4 text-sm" : "h-14 w-full text-lg"}`}
    >
      📞 Call 911
    </a>
  );
}
