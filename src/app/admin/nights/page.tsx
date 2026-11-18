"use client";

import { FormEvent, useState } from "react";
import { PhoneFrame } from "@/components/phone-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { metros } from "@/lib/metros";

export default function AdminNightsPage() {
  const [token, setToken] = useState("");
  const [cityId, setCityId] = useState(metros[0].id);
  const [kind, setKind] = useState<"girls" | "guys">("girls");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [deal, setDeal] = useState("");
  const [capacity, setCapacity] = useState("30");
  const [publicRsvp, setPublicRsvp] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    const response = await fetch("/api/admin/nights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        cityId,
        kind,
        eventDate,
        venue,
        deal,
        capacity: Number(capacity),
        publicRsvp,
      }),
    });
    const body = (await response.json()) as { ok?: boolean; message?: string; id?: number; city?: string };
    if (!response.ok || body.ok === false) {
      setError(body.message || "Could not post that night.");
      return;
    }
    setMessage(`Posted ${kind === "girls" ? "Girls' Night Out" : "Guys' Night Out"} in ${body.city}.`);
    setVenue("");
    setDeal("");
  }

  return (
    <PhoneFrame>
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
        <h1 className="font-serif text-3xl tracking-tight">Post a night</h1>
        <p className="text-sm text-muted-foreground">
          This form does nothing without the admin token. Leave the early-access box off and founding members can RSVP first.
        </p>
        <label className="block text-sm font-semibold">
          Admin token
          <Input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="mt-1 h-12 rounded-2xl"
            required
          />
        </label>
        <label className="block text-sm font-semibold">
          City
          <select
            value={cityId}
            onChange={(event) => setCityId(event.target.value)}
            className="mt-1 h-12 w-full rounded-2xl border bg-card px-3"
          >
            {metros.map((metro) => (
              <option key={metro.id} value={metro.id}>
                {metro.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Night
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value === "guys" ? "guys" : "girls")}
            className="mt-1 h-12 w-full rounded-2xl border bg-card px-3"
          >
            <option value="girls">Girls&apos; Night Out</option>
            <option value="guys">Guys&apos; Night Out</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Date
          <Input
            type="date"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
            className="mt-1 h-12 rounded-2xl"
            required
          />
        </label>
        <label className="block text-sm font-semibold">
          Venue
          <Input
            value={venue}
            onChange={(event) => setVenue(event.target.value)}
            className="mt-1 h-12 rounded-2xl"
            required
          />
        </label>
        <label className="block text-sm font-semibold">
          Member deal
          <Input
            value={deal}
            onChange={(event) => setDeal(event.target.value)}
            className="mt-1 h-12 rounded-2xl"
            required
          />
        </label>
        <label className="block text-sm font-semibold">
          Capacity
          <Input
            inputMode="numeric"
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            className="mt-1 h-12 rounded-2xl"
            required
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={publicRsvp}
            onChange={(event) => setPublicRsvp(event.target.checked)}
            className="mt-1"
          />
          Open RSVP to every member. Leave this off for founding members only.
        </label>
        <Button type="submit" className="h-12 w-full rounded-full">
          Post event
        </Button>
        {message && <p role="status" className="text-sm font-semibold">{message}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>
    </PhoneFrame>
  );
}
