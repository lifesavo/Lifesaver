"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { cn } from "cn";
import { PhoneFrame } from "@/components/phone-frame";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type InstitutionId } from "@/lib/demo-data";
import { useProfile } from "@/lib/profile";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Example bill set shown (and labeled "Example") until bank linking opens.
const EXAMPLE_ACCOUNTS: InstitutionId[] = ["chase", "capitalone", "pge"];

export function StartScreen() {
  const router = useRouter();
  const { ready, profile, completeOnboarding, reset } = useProfile();
  const emailId = useId();
  const zipId = useId();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  if (!ready) {
    return (
      <PhoneFrame>
        <p className="pt-16 text-sm text-muted-foreground" role="status">
          Opening LifeSaver…
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
            Weather, alerts, and deals near {profile.zip}.
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
              }}
            >
              Start over
            </Button>
          </div>
        </div>
      </PhoneFrame>
    );
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

  function finishFromZip() {
    if (!/^\d{5}$/.test(zip)) {
      setError("Use a 5-digit ZIP code.");
      return;
    }
    setError("");
    completeOnboarding({ email, zip, institutions: EXAMPLE_ACCOUNTS });
    router.push("/home");
  }

  return (
    <PhoneFrame>
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          <Wordmark compact />
        </div>
        <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Step {step + 1} of 2
        </p>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {[0, 1].map((index) => (
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
              Let&apos;s get you set up.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Your email is how you sign in on any phone or computer. We will also tell you before
              billing opens. No spam, no selling your info.
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
            </div>
          </form>
        )}

        {step === 1 && (
          <form
            className="mt-6 flex flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              finishFromZip();
            }}
          >
            <h1 className="font-serif text-4xl leading-[1.05] tracking-tight">
              What&apos;s your ZIP code?
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Weather, alerts, gas, and help requests are sorted around this ZIP. You can change it
              any time.
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

      </div>
    </PhoneFrame>
  );
}
