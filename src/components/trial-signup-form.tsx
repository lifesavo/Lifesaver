import type { FormEvent } from "react";
import Link from "next/link";
import { PhoneFrame } from "@/components/phone-frame";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trialDisclosureShort, trialPriceLabel } from "@/lib/pricing";

export const TRIAL_FORM_ERRORS: Record<string, string> = {
  invalid_email: "Enter an email like alex@example.com.",
  exists: "That email already has a LifeSaver account. Sign in with a code.",
  billing_closed: "Billing isn't open on this server yet, so checkout didn't start. You can open the app now.",
  checkout_failed: "Checkout didn't open. Try again in a minute.",
  rate_limit: "Too many sign-ups from here. Try again in an hour.",
  already_subscribed: "You already have a plan. Use Manage billing in Settings to change it.",
  offline: "You look offline. Try again when you have a signal.",
};

export function trialErrorMessage(code: string | null | undefined) {
  if (!code) return "";
  return TRIAL_FORM_ERRORS[code] || "";
}

function signInHref(utmSource?: string, refCode?: string) {
  const params = new URLSearchParams({ trial: "1", mode: "signin" });
  if (utmSource) params.set("utm_source", utmSource);
  if (refCode) params.set("ref", refCode);
  return `/start?${params.toString()}`;
}

/** Email-only trial form. Server-renderable so the field and CTA show before JavaScript loads. */
export function TrialSignupForm({
  email = "",
  onEmailChange,
  error,
  pending = false,
  canceled = false,
  utmSource = "",
  refCode = "",
  priceLabel = trialPriceLabel(false),
  onSubmit,
  onSignIn,
  emailId = "trial-email",
  signInHref: signIn = "",
}: {
  email?: string;
  onEmailChange?: (value: string) => void;
  error?: string;
  pending?: boolean;
  canceled?: boolean;
  utmSource?: string;
  refCode?: string;
  priceLabel?: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onSignIn?: () => void;
  emailId?: string;
  signInHref?: string;
}) {
  const loginHref = signIn || signInHref(utmSource, refCode);
  return (
    <PhoneFrame>
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          <Wordmark compact />
          {onSignIn ? (
            <Button type="button" variant="ghost" className="h-10 rounded-full px-3" onClick={onSignIn}>
              Sign in
            </Button>
          ) : (
            <Button type="button" variant="ghost" className="h-10 rounded-full px-3" asChild>
              <Link href={loginHref}>Sign in</Link>
            </Button>
          )}
        </div>
        <form
          className="mt-5 flex flex-1 flex-col"
          method="post"
          action="/api/account/trial"
          onSubmit={onSubmit}
        >
          <h1 className="font-serif text-[2.15rem] leading-[1.05] tracking-tight sm:text-4xl">Try it free</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{trialDisclosureShort(priceLabel)}</p>
          {canceled ? (
            <p className="mt-3 rounded-2xl bg-secondary px-3 py-2 text-sm" role="status">
              Checkout canceled. Nothing was charged. You can try again below.
            </p>
          ) : null}
          <div className="mt-5 space-y-1.5">
            <Label htmlFor={emailId}>Email</Label>
            <Input
              id={emailId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              required
              maxLength={254}
              value={onEmailChange ? email : undefined}
              defaultValue={onEmailChange ? undefined : email}
              onChange={onEmailChange ? (event) => onEmailChange(event.target.value) : undefined}
              placeholder="you@email.com"
              aria-invalid={error ? true : undefined}
              className="h-12 rounded-2xl px-4 text-base"
            />
          </div>
          {utmSource ? <input type="hidden" name="utm_source" value={utmSource} /> : null}
          {refCode ? <input type="hidden" name="ref" value={refCode} /> : null}
          {error ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-2">
            <Button
              type="submit"
              className="h-14 rounded-full text-lg font-bold"
              disabled={pending}
            >
              {pending ? "Starting your trial…" : "Try it free"}
            </Button>
            <p className="text-center text-xs leading-5 text-muted-foreground">
              You&apos;ll add a card next. You won&apos;t be charged today. Cancel anytime in Settings.
            </p>
          </div>
        </form>
      </div>
    </PhoneFrame>
  );
}
