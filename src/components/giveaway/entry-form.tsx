"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GiveawayEntryForm({
  method,
  defaultEmail = "",
  submitLabel,
  onEntered,
}: {
  method: "app" | "amoe";
  defaultEmail?: string;
  submitLabel: string;
  onEntered: (already: boolean, email: string) => void;
}) {
  const ids = { email: useId(), first: useId(), last: useId(), eligible: useId() };
  const [email, setEmail] = useState(defaultEmail);
  const [firstName, setFirstName] = useState("");
  const [lastInitial, setLastInitial] = useState("");
  const [eligible, setEligible] = useState(false);
  const [company, setCompany] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/giveaway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastInitial, eligible, method, company }),
      });
      const data = (await response.json()) as { ok: boolean; already?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setError(data.message || "We couldn't save your entry. Try again.");
        return;
      }
      onEntered(Boolean(data.already), email.trim().toLowerCase());
    } catch {
      setError("We couldn't reach LifeSaver. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-3" noValidate>
      <div className="grid grid-cols-[1fr_5.5rem] gap-2">
        <div>
          <Label htmlFor={ids.first}>First name</Label>
          <Input
            id={ids.first}
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="mt-1 h-12 rounded-2xl"
            required
          />
        </div>
        <div>
          <Label htmlFor={ids.last}>Last initial</Label>
          <Input
            id={ids.last}
            maxLength={1}
            value={lastInitial}
            onChange={(event) => setLastInitial(event.target.value)}
            className="mt-1 h-12 rounded-2xl text-center uppercase"
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor={ids.email}>Email</Label>
        <Input
          id={ids.email}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 h-12 rounded-2xl"
          required
        />
      </div>
      <div className="hidden" aria-hidden="true">
        <label>
          Company
          <input tabIndex={-1} autoComplete="off" value={company} onChange={(event) => setCompany(event.target.value)} />
        </label>
      </div>
      <label htmlFor={ids.eligible} className="flex items-start gap-2 text-sm leading-5">
        <input
          id={ids.eligible}
          type="checkbox"
          checked={eligible}
          onChange={(event) => setEligible(event.target.checked)}
          className="mt-1 size-4"
        />
        <span>
          I&apos;m a legal U.S. resident, 18 or older, and I agree to the{" "}
          <Link href="/giveaway-rules" className="font-semibold text-primary underline">
            Official Rules
          </Link>
          .
        </span>
      </label>
      <Button type="submit" disabled={pending} className="h-12 w-full rounded-full text-base">
        {pending ? "Saving…" : submitLabel}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
