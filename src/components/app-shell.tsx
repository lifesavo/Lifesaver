"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Car, HandHelping, House, Sparkles, Tag } from "lucide-react";
import { cn } from "cn";
import { PhoneFrame } from "@/components/phone-frame";
import { useProfile } from "@/lib/profile";

const tabs = [
  { href: "/home", label: "Home", icon: House },
  { href: "/deals", label: "Deals", icon: Tag },
  { href: "/hand", label: "Hand", icon: HandHelping },
  { href: "/rides", label: "Rides", icon: Car },
  { href: "/pricing", label: "Plans", icon: Sparkles },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, profile } = useProfile();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (ready && !profile) router.replace("/start");
  }, [ready, profile, router]);

  if (!ready || !profile) {
    return (
      <PhoneFrame>
        <p className="pt-16 text-sm text-muted-foreground" role="status">
          Opening your demo…
        </p>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame
      nav={
        <nav
          aria-label="App"
          className="border-t border-border bg-card/95 px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur"
        >
          <ul className="flex">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              const Icon = tab.icon;
              return (
                <li key={tab.href} className="flex-1">
                  <Link
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      }
    >
      {children}
    </PhoneFrame>
  );
}
