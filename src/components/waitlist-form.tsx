"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Success = {
  already: boolean;
  count: number;
  email: string;
};

export function WaitlistForm({ idPrefix = "waitlist" }: { idPrefix?: string }) {
  const emailId = useId();
  const zipId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [company, setCompany] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [countError, setCountError] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState<Success | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/waitlist")
      .then(async (response) => {
        if (!response.ok) throw new Error("count");
        return (await response.json()) as { count: number };
      })
      .then((data) => {
        if (!cancelled) setCount(data.count);
      })
      .catch(() => {
        if (!cancelled) setCountError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, zip, company }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        already?: boolean;
        count?: number;
        email?: string;
      };
      if (!response.ok || !data.ok) {
        setError(data.message || "We couldn't save that. Try again.");
        return;
      }
      setSuccess({
        already: Boolean(data.already),
        count: data.count ?? count ?? 1,
        email: data.email || email.trim().toLowerCase(),
      });
      if (typeof data.count === "number") setCount(data.count);
    } catch {
      setError("We couldn't reach the waitlist. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-3xl bg-primary px-5 py-6 text-primary-foreground" role="status">
        <p className="font-serif text-3xl leading-tight">
          {success.already ? "You're already on the list." : "You're on the list."}
        </p>
        <p className="mt-3 text-sm leading-6 text-primary-foreground/85">
          {success.email ? (
            <>
              We saved <span className="font-semibold">{success.email}</span> in this app&apos;s
              database.
            </>
          ) : (
            "We saved your note."
          )}{" "}
          {success.count === 1
            ? "You're the first one here."
            : `${success.count} people are waiting with you.`}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border bg-card p-5 shadow-sm" noValidate>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-2xl tracking-tight">Join the waitlist</h2>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {count === null && !countError && "Checking the list…"}
          {count === 0 && "Be the first."}
          {typeof count === "number" && count > 0 && `${count} waiting`}
          {countError && count === null && "List is local"}
        </p>
      </div>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        A note when we open near you. This prototype stores the email on the server.
      </p>
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${emailId}`}>Email</Label>
          <Input
            id={`${idPrefix}-${emailId}`}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-12 rounded-2xl bg-background px-4 text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${zipId}`}>ZIP code, optional</Label>
          <Input
            id={`${idPrefix}-${zipId}`}
            name="zip"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            value={zip}
            onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="94110"
            className="h-12 rounded-2xl bg-background px-4 text-base"
          />
        </div>
        <div className="absolute -left-[9999px] h-0 overflow-hidden" aria-hidden="true">
          <label>
            Company
            <input
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </label>
        </div>
        {error && (
          <p id={errorId} className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="h-12 w-full rounded-full text-base">
          {pending ? "Saving…" : "Join the waitlist"}
        </Button>
      </div>
    </form>
  );
}
