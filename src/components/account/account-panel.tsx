"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/profile";

export function AccountPanel() {
  const router = useRouter();
  const { account, accountChecked, profile, signOut, billingOpen } = useProfile();
  const [link, setLink] = useState<{ code: string; minutes: number } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!accountChecked) {
    return <section className="rounded-3xl border-2 border-ink/10 bg-card p-4 text-sm text-muted-foreground">Checking your account…</section>;
  }

  if (!account) {
    return (
      <section className="space-y-3 rounded-3xl border-2 border-ink/10 bg-card p-4">
        <h2 className="font-serif text-2xl">Account</h2>
        <p className="text-sm text-muted-foreground">
          {profile
            ? `${profile.email} is saved on this phone only. Sign in to use it on your other devices.`
            : "Sign in to see your LifeSaver on this device."}
        </p>
        <Button asChild className="h-12 w-full rounded-full">
          <Link href="/start?mode=signin">Sign in</Link>
        </Button>
      </section>
    );
  }

  async function makeCode() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/link-code", { method: "POST" });
      const data = (await response.json()) as { ok?: boolean; code?: string; minutes?: number; message?: string };
      if (data.ok && data.code) setLink({ code: data.code, minutes: data.minutes ?? 10 });
      else setMessage(data.message || "Couldn't make a code. Try again.");
    } catch {
      setMessage("You look offline. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function manageBilling() {
    setBusy(true);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await response.json()) as { url?: string; message?: string };
      if (data.url) window.location.href = data.url;
      else setMessage(data.message || "Billing isn't available right now.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!data.ok) {
        setMessage(data.message || "Couldn't delete the account.");
        return;
      }
      await signOut();
      router.push("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-3xl border-2 border-ink/10 bg-card p-4">
      <h2 className="font-serif text-2xl">Account</h2>
      <p className="text-sm">
        Signed in as <span className="font-semibold">{account.email}</span>
        {account.founding ? " · Founding member" : ""}
      </p>
      {account.subscriptionStatus === "trialing" ? (
        <p className="rounded-2xl bg-lime px-3 py-2 text-sm text-ink" role="status">
          You&apos;re on a 7-day free trial of Premium. No card is needed to start. Add a card before your trial ends to keep Premium; if you don&apos;t, the trial ends and you won&apos;t be charged.
        </p>
      ) : account.trialEndsAt && !["active", "trialing", "past_due"].includes(account.subscriptionStatus || "") && !account.hasPaymentMethod ? (
        <p className="rounded-2xl bg-sun/40 px-3 py-2 text-sm" role="status">
          Your 7-day free trial has ended. Add a card on the Home screen to keep Premium. Until then, Premium features are locked and you won&apos;t be charged.
        </p>
      ) : null}

      <div className="rounded-2xl bg-secondary p-3">
        <p className="font-semibold">Sign in on another device</p>
        <p className="mt-1 text-sm text-muted-foreground">
          On the other phone (or the LifeSaver icon on your home screen), tap Sign in, enter your email, then this code.
        </p>
        {link ? (
          <p className="mt-2 text-center font-serif text-4xl tracking-[0.3em]" role="status" aria-live="polite">
            {link.code}
            <span className="mt-1 block font-sans text-xs tracking-normal text-muted-foreground">Works for {link.minutes} minutes, one time.</span>
          </p>
        ) : null}
        <Button type="button" variant="outline" className="mt-2 h-11 w-full rounded-full" disabled={busy} onClick={() => void makeCode()}>
          {link ? "Get a new code" : "Show a sign-in code"}
        </Button>
      </div>

      {billingOpen && account.hasBilling ? (
        <Button type="button" variant="outline" className="h-11 w-full rounded-full" disabled={busy} onClick={() => void manageBilling()}>
          Manage billing
        </Button>
      ) : null}

      {message ? (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        className="h-11 w-full rounded-full"
        onClick={async () => {
          await signOut();
          router.push("/");
        }}
      >
        Sign out
      </Button>
      {confirmDelete ? (
        <div className="rounded-2xl border border-destructive/40 p-3 text-sm">
          <p>Delete your LifeSaver account? This can&apos;t be undone.</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="destructive" className="h-10 flex-1 rounded-full" disabled={busy} onClick={() => void deleteAccount()}>
              Delete
            </Button>
            <Button type="button" variant="outline" className="h-10 flex-1 rounded-full" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
          </div>
        </div>
      ) : (
        <button type="button" className="block w-full text-center text-xs text-muted-foreground underline" onClick={() => setConfirmDelete(true)}>
          Delete my account
        </button>
      )}
    </section>
  );
}
