"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { cn } from "cn";
import { PhoneFrame } from "@/components/phone-frame";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type InstitutionId } from "@/lib/demo-data";
import { useProfile, type AccountUser } from "@/lib/profile";
import { TRIAL_CANCEL_HINT, TRIAL_DAYS, trialDisclosure, trialPriceLabel } from "@/lib/pricing";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Example bill set shown (and labeled "Example") until bank linking opens.
const EXAMPLE_ACCOUNTS: InstitutionId[] = ["chase", "capitalone", "pge"];

type Mode = "signup" | "signin";

async function post<T>(url: string, body: unknown): Promise<{ status: number; data: T }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, data };
}

export function StartScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { ready, profile, account, emailLogin, needsSignIn, completeOnboarding, applyAccount, signOut, billingOpen } = useProfile();
  const emailId = useId();
  const zipId = useId();
  const codeId = useId();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signin" ? "signin" : "signup");
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const trial = params.get("trial") === "1";
  const checkoutState = params.get("checkout");

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
            {account ? "You're signed in." : "You're set up on this phone."}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {profile.email}
            <br />
            Weather, alerts, and deals near {profile.zip || "you"}.
          </p>
          {!account && needsSignIn ? (
            <p className="mt-4 rounded-2xl bg-sun/40 px-3 py-2 text-sm">
              This email already has a LifeSaver account. Sign in to sync it here.
            </p>
          ) : null}
          {checkoutState === "canceled" ? (
            <p className="mt-4 rounded-2xl bg-secondary px-3 py-2 text-sm" role="status">
              Checkout canceled. Nothing was charged.
            </p>
          ) : null}
          {trial ? (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {trialDisclosure(trialPriceLabel(Boolean(account?.founding)))} {TRIAL_CANCEL_HINT}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-8 flex flex-col gap-3">
            {trial && account && !["active", "trialing", "past_due"].includes(account.subscriptionStatus || "") ? (
              <Button
                type="button"
                className="h-12 rounded-full text-base"
                disabled={pending}
                onClick={() => void startTrialCheckout()}
              >
                {pending ? "Opening checkout…" : billingOpen ? `Start ${TRIAL_DAYS}-day free trial` : "Continue"}
              </Button>
            ) : null}
            <Button asChild className="h-12 rounded-full text-base" variant={trial && account && !["active", "trialing", "past_due"].includes(account.subscriptionStatus || "") ? "outline" : "default"}>
              <Link href="/home">Go to the dashboard</Link>
            </Button>
            {!account ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-full text-base"
                onClick={() => {
                  setEditing(true);
                  setMode("signin");
                  setEmail(profile.email);
                }}
              >
                Sign in to sync
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="h-12 rounded-full text-base"
              onClick={async () => {
                await signOut();
                setEditing(true);
                setMode("signup");
                setStep(0);
                setEmail("");
                setZip("");
              }}
            >
              {account ? "Sign out" : "Start over"}
            </Button>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  function finishWith(user: AccountUser | null, fallbackEmail: string, fallbackZip: string) {
    if (user) applyAccount(user);
    else completeOnboarding({ email: fallbackEmail, zip: fallbackZip, institutions: EXAMPLE_ACCOUNTS });
    router.push("/home");
  }

  async function startTrialCheckout() {
    setError("");
    setPending(true);
    try {
      const { status, data } = await post<{ ok?: boolean; url?: string; message?: string }>(
        "/api/billing/checkout",
        { plan: "premium", trial: true },
      );
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (status === 503) {
        setError("Billing isn't open on this server yet, so checkout didn't start. Your account is ready — you can open the app now.");
        return;
      }
      setError(data.message || "Checkout didn't open. Try again in a minute.");
    } catch {
      setError("You look offline. Try again when you have a signal.");
    } finally {
      setPending(false);
    }
  }

  function checkEmail() {
    const value = email.trim().toLowerCase();
    if (!EMAIL.test(value) || value.length > 254) {
      setError("Enter an email like alex@example.com.");
      return null;
    }
    setEmail(value);
    setError("");
    return value;
  }

  async function finishSignup() {
    if (!/^\d{5}$/.test(zip)) {
      setError("Use a 5-digit ZIP code.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const { status, data } = await post<{ ok?: boolean; exists?: boolean; user?: AccountUser; message?: string }>(
        "/api/account/signup",
        { email, zip, ref: params.get("ref") ?? undefined },
      );
      if (data.ok && data.user) {
        applyAccount(data.user);
        if (trial) {
          await startTrialCheckout();
          return;
        }
        return finishWith(data.user, email, zip);
      }
      if (status === 409 && data.exists) {
        setMode("signin");
        setCodeSent(false);
        setNotice("That email already has a LifeSaver account. Sign in with a code below.");
        return;
      }
      if (status >= 500 || status === 0) return finishWith(null, email, zip); // server down: keep going on this phone
      setError(data.message || "That didn't work. Try again.");
    } catch {
      finishWith(null, email, zip);
    } finally {
      setPending(false);
    }
  }

  async function sendCode() {
    const value = checkEmail();
    if (!value) return;
    setPending(true);
    setNotice("");
    try {
      const { data } = await post<{ ok?: boolean; message?: string }>("/api/account/code", { email: value });
      if (data.ok) {
        setCodeSent(true);
        setNotice(data.message || "Check your email for a 6-digit code.");
      } else {
        setError(data.message || "We couldn't send a code. Try again.");
      }
    } catch {
      setError("You look offline. Try again when you have a signal.");
    } finally {
      setPending(false);
    }
  }

  async function verify() {
    const value = checkEmail();
    if (!value) return;
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setPending(true);
    try {
      const { data } = await post<{ ok?: boolean; user?: AccountUser; message?: string }>("/api/account/verify", {
        email: value,
        code: digits,
      });
      if (data.ok && data.user) return finishWith(data.user, value, data.user.zip || "");
      setError(data.message || "That code didn't match. Try again.");
    } catch {
      setError("You look offline. Try again when you have a signal.");
    } finally {
      setPending(false);
    }
  }

  const errorLine = error ? (
    <p className="mt-2 text-sm text-destructive" role="alert">
      {error}
    </p>
  ) : null;

  if (mode === "signin") {
    return (
      <PhoneFrame>
        <div className="flex min-h-full flex-col">
          <Wordmark compact />
          <form
            className="mt-8 flex flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              void verify();
            }}
          >
            <h1 className="font-serif text-4xl leading-[1.05] tracking-tight">Sign in</h1>
            {notice ? (
              <p className="mt-3 rounded-2xl bg-secondary px-3 py-2 text-sm" role="status">
                {notice}
              </p>
            ) : null}
            <div className="mt-6 space-y-1.5">
              <Label htmlFor={emailId}>Email</Label>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="alex@example.com"
                className="h-12 rounded-2xl px-4 text-base"
              />
            </div>
            {emailLogin ? (
              <Button
                type="button"
                variant="outline"
                className="mt-3 h-12 rounded-full text-base"
                disabled={pending}
                onClick={() => void sendCode()}
              >
                {codeSent ? "Send a new code" : "Email me a code"}
              </Button>
            ) : null}
            <div className="mt-5 space-y-1.5">
              <Label htmlFor={codeId}>6-digit code</Label>
              <Input
                id={codeId}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="h-12 rounded-2xl px-4 text-center text-2xl tracking-[0.4em]"
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {emailLogin
                ? "Use the code we email you, or a code from a phone or computer where you're already signed in (Settings, then Sign in on another device)."
                : "On a phone or computer where you're already signed in, open Settings and tap Sign in on another device. Type that code here."}
            </p>
            {errorLine}
            <div className="mt-auto flex flex-col gap-3 pt-8">
              <Button type="submit" className="h-12 rounded-full text-base" disabled={pending}>
                {pending ? "Checking…" : "Sign in"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-12 rounded-full text-base"
                onClick={() => {
                  setMode("signup");
                  setStep(0);
                  setError("");
                  setNotice("");
                }}
              >
                New here? Create an account
              </Button>
            </div>
          </form>
        </div>
      </PhoneFrame>
    );
  }

  if (trial) {
    const price = trialPriceLabel(Boolean(account?.founding));
    return (
      <PhoneFrame>
        <div className="flex min-h-full flex-col">
          <div className="flex items-center justify-between gap-3">
            <Wordmark compact />
            <Button
              type="button"
              variant="ghost"
              className="h-10 rounded-full px-3"
              onClick={() => {
                setMode("signin");
                setError("");
              }}
            >
              Sign in
            </Button>
          </div>
          <form
            className="mt-6 flex flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              if (!checkEmail()) return;
              void finishSignup();
            }}
          >
            <h1 className="font-serif text-4xl leading-[1.05] tracking-tight">Try Premium free for {TRIAL_DAYS} days.</h1>
            {checkoutState === "canceled" ? (
              <p className="mt-3 rounded-2xl bg-secondary px-3 py-2 text-sm" role="status">
                Checkout canceled. Nothing was charged. You can try again below.
              </p>
            ) : null}
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {trialDisclosure(price)} {TRIAL_CANCEL_HINT}
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
            <div className="mt-4 space-y-1.5">
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
            {errorLine}
            <div className="mt-auto flex flex-col gap-3 pt-8">
              <Button type="submit" className="h-12 rounded-full text-base" disabled={pending}>
                {pending ? "Starting your trial…" : "Try it free"}
              </Button>
              <p className="text-center text-xs leading-5 text-muted-foreground">
                You&apos;ll enter your card on the next screen. You won&apos;t be charged today.
              </p>
            </div>
          </form>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          <Wordmark compact />
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-full px-3"
            onClick={() => {
              setMode("signin");
              setError("");
            }}
          >
            Sign in
          </Button>
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
              if (checkEmail()) setStep(1);
            }}
          >
            <h1 className="font-serif text-4xl leading-[1.05] tracking-tight">Let&apos;s get you set up.</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Your email is your LifeSaver account, so it works on any phone or computer. We will also
              tell you before billing opens. No spam, no selling your info.
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
            {errorLine}
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
              void finishSignup();
            }}
          >
            <h1 className="font-serif text-4xl leading-[1.05] tracking-tight">What&apos;s your ZIP code?</h1>
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
            {errorLine}
            <div className="mt-auto flex flex-col gap-3 pt-8">
              <Button type="submit" className="h-12 rounded-full text-base" disabled={pending}>
                {pending ? "Creating your account…" : "Create my account"}
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
