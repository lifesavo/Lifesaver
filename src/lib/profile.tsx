"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { BillActionKind, InstitutionId } from "@/lib/demo-data";

const STORAGE_KEY = "ymls.profile.v1";

export type BillAction = {
  kind: BillActionKind;
  detail: string;
};

export type Profile = {
  email: string;
  zip: string;
  institutions: InstitutionId[];
  plan: "free" | "premium" | "hand";
  actions: Record<string, BillAction>;
};

type ProfileContextValue = {
  ready: boolean;
  profile: Profile | null;
  completeOnboarding: (input: {
    email: string;
    zip: string;
    institutions: InstitutionId[];
  }) => void;
  setPlan: (plan: Profile["plan"]) => void;
  setAction: (billId: string, action: BillAction) => void;
  clearAction: (billId: string) => void;
  reset: () => void;
  /** The server account signed in on this browser, if any. */
  account: AccountUser | null;
  accountChecked: boolean;
  emailLogin: boolean;
  billingOpen: boolean;
  /** A local profile exists but its email already has an account this browser is not signed in to. */
  needsSignIn: boolean;
  /** Save the signed-in account into this browser's profile. */
  applyAccount: (user: AccountUser) => void;
  refreshAccount: () => Promise<void>;
  signOut: () => Promise<void>;
};

export type AccountUser = {
  id: string;
  email: string;
  zip: string | null;
  plan: Profile["plan"];
  founding: boolean;
  emailVerified: boolean;
  subscriptionStatus: string | null;
  hasBilling: boolean;
  trialEndsAt: string | null;
  hasPaymentMethod: boolean;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function readProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    if (
      typeof parsed.email !== "string" ||
      typeof parsed.zip !== "string" ||
      !Array.isArray(parsed.institutions) ||
      parsed.institutions.length === 0
    ) {
      return null;
    }
    return {
      email: parsed.email,
      zip: parsed.zip,
      institutions: parsed.institutions as InstitutionId[],
      plan:
        parsed.plan === "hand" || parsed.plan === "premium" ? parsed.plan : "free",
      actions:
        parsed.actions && typeof parsed.actions === "object"
          ? parsed.actions
          : {},
    };
  } catch {
    return null;
  }
}

const DEFAULT_INSTITUTIONS: InstitutionId[] = ["chase", "capitalone", "pge"];

function profileFromAccount(user: AccountUser, local: Profile | null): Profile {
  const sameUser = local && local.email === user.email;
  return {
    email: user.email,
    zip: user.zip || (sameUser ? local.zip : "") || local?.zip || "",
    institutions: sameUser && local.institutions.length ? local.institutions : DEFAULT_INSTITUTIONS,
    plan: user.plan,
    actions: sameUser ? local.actions : {},
  };
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const isClient = useIsClient();
  const [version, setVersion] = useState(0);
  const [account, setAccount] = useState<AccountUser | null>(null);
  const [accountChecked, setAccountChecked] = useState(false);
  const [emailLogin, setEmailLogin] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const started = useRef(false);
  const local = isClient && version >= 0 ? readProfile() : null;
  // Show the app at once when this browser has a profile; otherwise wait for the account check.
  const ready = isClient && (local !== null || accountChecked);
  const profile = local;

  const write = useCallback((next: Profile | null) => {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
    setVersion((current) => current + 1);
  }, []);

  const applyAccount = useCallback(
    (user: AccountUser) => {
      setAccount(user);
      setNeedsSignIn(false);
      write(profileFromAccount(user, readProfile()));
    },
    [write],
  );

  const refreshAccount = useCallback(async () => {
    try {
      const response = await fetch("/api/account", { cache: "no-store" });
      const data = (await response.json()) as { user: AccountUser | null; emailLogin: boolean; billingOpen: boolean };
      setEmailLogin(Boolean(data.emailLogin));
      setBillingOpen(Boolean(data.billingOpen));
      if (data.user) {
        applyAccount(data.user);
        return;
      }
      setAccount(null);
      // Older browser-only profiles: turn them into an account when the email is free.
      const existing = readProfile();
      if (existing && /^\d{5}$/.test(existing.zip) && existing.email !== "alex@example.com") {
        const signup = await fetch("/api/account/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: existing.email, zip: existing.zip }),
        });
        const result = (await signup.json()) as { ok?: boolean; exists?: boolean; user?: AccountUser };
        if (result.ok && result.user) {
          if (existing.plan !== "free" && !data.billingOpen) {
            await fetch("/api/account", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ plan: existing.plan }),
            });
            result.user.plan = existing.plan;
          }
          applyAccount(result.user);
        } else if (result.exists) {
          setNeedsSignIn(true);
        }
      }
    } catch {
      // Offline or server hiccup: the browser profile keeps working.
    } finally {
      setAccountChecked(true);
    }
  }, [applyAccount]);

  useEffect(() => {
    if (!isClient || started.current) return;
    started.current = true;
    void refreshAccount();
  }, [isClient, refreshAccount]);

  const signOut = useCallback(async () => {
    await fetch("/api/account/logout", { method: "POST" }).catch(() => null);
    setAccount(null);
    setNeedsSignIn(false);
    write(null);
  }, [write]);

  const update = useCallback((change: (current: Profile) => Profile) => {
    const current = readProfile();
    if (!current) return;
    write(change(current));
  }, [write]);

  const completeOnboarding = useCallback(
    (input: { email: string; zip: string; institutions: InstitutionId[] }) => {
      write({
        email: input.email.trim().toLowerCase(),
        zip: input.zip,
        institutions: input.institutions,
        plan: "free",
        actions: {},
      });
    },
    [write],
  );

  const setPlan = useCallback(
    (plan: Profile["plan"]) => {
      update((current) => ({ ...current, plan }));
      if (account && !billingOpen) {
        setAccount({ ...account, plan });
        void fetch("/api/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        }).catch(() => null);
      }
    },
    [update, account, billingOpen],
  );

  const setAction = useCallback(
    (billId: string, action: BillAction) => {
      update((current) => ({
        ...current,
        actions: { ...current.actions, [billId]: action },
      }));
    },
    [update],
  );

  const clearAction = useCallback(
    (billId: string) => {
      update((current) => {
        const actions = { ...current.actions };
        delete actions[billId];
        return { ...current, actions };
      });
    },
    [update],
  );

  const reset = useCallback(() => write(null), [write]);

  return (
    <ProfileContext.Provider
      value={{
        ready,
        profile,
        completeOnboarding,
        setPlan,
        setAction,
        clearAction,
        reset,
        account,
        accountChecked,
        emailLogin,
        billingOpen,
        needsSignIn,
        applyAccount,
        refreshAccount,
        signOut,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return value;
}
