"use client";

import {
  createContext,
  useCallback,
  useContext,
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
  plan: "free" | "premium";
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
      plan: parsed.plan === "premium" ? "premium" : "free",
      actions:
        parsed.actions && typeof parsed.actions === "object"
          ? parsed.actions
          : {},
    };
  } catch {
    return null;
  }
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const ready = useIsClient();
  const [version, setVersion] = useState(0);
  const profile = ready && version >= 0 ? readProfile() : null;

  const write = useCallback((next: Profile | null) => {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
    setVersion((current) => current + 1);
  }, []);

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
    },
    [update],
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
