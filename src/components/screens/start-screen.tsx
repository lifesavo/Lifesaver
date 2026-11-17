"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "cn";
import { PhoneFrame } from "@/components/phone-frame";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { institutions, type InstitutionId } from "@/lib/demo-data";
import { useProfile } from "@/lib/profile";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAMPLE_ACCOUNTS: InstitutionId[] = ["chase", "capitalone", "pge"];

export function StartScreen() {
  const router = useRouter();
  const { ready, profile, completeOnboarding, reset } = useProfile();
  const emailId = useId();
  const zipId = useId();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [selected, setSelected] = useState<InstitutionId[]>([]);
  const [connecting, setConnecting] = useState<InstitutionId | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  if (!ready) {
    return (
      <PhoneFrame>
        <p className="pt-16 text-sm text-muted-foreground" role="status">
          Opening your demo…
        </p>
      </PhoneFrame>
    );
  }

  if (profile && !editing) {
    return (
      <PhoneFrame>
        <div className="flex min-h-full flex-col pt-6">
          <Wordmark />
          <h1 className="mt-8 font-serif text-4xl leading-[1.05] tracking-tight">
            You&apos;re already set up.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {profile.email}
            <br />
            Deals aimed at {profile.zip}. Sample accounts only.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button asChild className="h-12 rounded-full text-base">
              <Link href="/home">Go to the dashboard</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-full text-base"
              onClick={() => {
                reset();
                setEditing(true);
                setStep(0);
                setEmail("");
                setZip("");
                setSelected([]);
              }}
            >
              Start over
            </Button>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  function useSample() {
    completeOnboarding({
      email: "alex@example.com",
      zip: "94110",
      institutions: SAMPLE_ACCOUNTS,
    });
    router.push("/home");
  }

  function nextFromEmail() {
    const value = email.trim().toLowerCase();
    if (!EMAIL.test(value) || value.length > 254) {
      setError("Enter an email like alex@example.com.");
      return;
    }
    setEmail(value);
    setError("");
    setStep(1);
  }

  function nextFromZip() {
    if (!/^\d{5}$/.test(zip)) {
      setError("Use a 5-digit ZIP code.");
      return;
    }
    setError("");
    setStep(2);
  }

  function toggleInstitution(id: InstitutionId) {
    if (connecting) return;
    if (selected.includes(id)) {
      setSelected((current) => current.filter((item) => item !== id));
      setError("");
      return;
    }
    setConnecting(id);
    window.setTimeout(() => {
      setSelected((current) => (current.includes(id) ? current : [...current, id]));
      setConnecting(null);
      setError("");
    }, 650);
  }

  function finish() {
    if (selected.length === 0) {
      setError("Connect at least one sample account.");
      return;
    }
    completeOnboarding({ email, zip, institutions: selected });
    router.push("/home");
  }

  return (
    <PhoneFrame>
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          <Wordmark compact />
          <Button type="button" variant="ghost" className="h-10 rounded-full px-3" onClick={useSample}>
            Sample profile
          </Button>
        </div>
        <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Step {step + 1} of 3
        </p>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={cn("h-1 flex-1 rounded-full", index <= step ? "bg-primary" : "bg-border")}
            />
          ))}
        </div>

        {step === 0 && (
          <form
            className="mt-6 flex flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              nextFromEmail();
            }}
          >
            <h1 className="font-serif text-4xl leading-[1.05] tracking-tight">
              Where should we send savings notes?
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              This demo keeps your email in the browser only. The public waitlist, on the home page of
              the site, is the one we store.
            </p>
            <div className="mt-6 space-y-1.5">
              <Label htmlFor={emailId}>Email</Label>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="alex@example.com"
                aria-invalid={error ? true : undefined}
                className="h-12 rounded-2xl px-4 text-base"
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="mt-auto flex flex-col gap-3 pt-8">
              <Button type="submit" className="h-12 rounded-full text-base">
                Continue
              </Button>
              <Button type="button" variant="outline" className="h-12 rounded-full text-base" onClick={useSample}>
                Use alex@example.com in 94110
              </Button>
            </div>
          </form>
        )}

        {step === 1 && (
          <form
            className="mt-6 flex flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              nextFromZip();
            }}
          >
            <h1 className="font-serif text-4xl leading-[1.05] tracking-tight">
              Where should we look for deals?
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Gas, groceries, and food are sorted around this ZIP. Prices in the demo are labeled
              samples, not a live feed.
            </p>
            <div className="mt-6 space-y-1.5">
              <Label htmlFor={zipId}>ZIP code</Label>
              <Input
                id={zipId}
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                value={zip}
                onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="94110"
                aria-invalid={error ? true : undefined}
                className="h-12 rounded-2xl px-4 text-base"
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="mt-auto flex flex-col gap-3 pt-8">
              <Button type="submit" className="h-12 rounded-full text-base">
                Continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-12 rounded-full text-base"
                onClick={() => {
                  setError("");
                  setStep(0);
                }}
              >
                Back
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="mt-6 flex flex-1 flex-col">
            <h1 className="font-serif text-4xl leading-[1.05] tracking-tight">
              Connect your accounts
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Pick the sample accounts to watch. Nothing here reaches a bank.
            </p>
            <aside className="mt-4 rounded-2xl border border-dashed border-primary/30 bg-secondary/60 p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">
                Future integration · Plaid
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                The live app will use Plaid to read transactions and spot recurring bills. Read-only.
                We never see your bank password. This prototype does not call Plaid.
              </p>
            </aside>
            <ul className="mt-4 space-y-2" aria-label="Sample institutions">
              {institutions.map((institution) => {
                const on = selected.includes(institution.id);
                const busy = connecting === institution.id;
                return (
                  <li key={institution.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleInstitution(institution.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left",
                        on ? "border-primary bg-secondary" : "border-border bg-card",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full text-sm font-semibold",
                          on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                        aria-hidden="true"
                      >
                        {on ? <Check className="size-4" /> : institution.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{institution.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {busy ? "Connecting sample account…" : `${institution.kind} · ${institution.detail}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {error && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="mt-auto flex flex-col gap-3 pt-6">
              <Button type="button" className="h-12 rounded-full text-base" onClick={finish}>
                See what you&apos;d save
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-full text-base"
                onClick={() => {
                  setSelected(SAMPLE_ACCOUNTS);
                  setError("");
                }}
              >
                Load sample accounts
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-12 rounded-full text-base"
                onClick={() => {
                  setError("");
                  setStep(1);
                }}
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
