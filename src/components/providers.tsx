"use client";

import { ProfileProvider } from "@/lib/profile";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>;
}
