"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { cn } from "cn";
import { canPromptInstall, isStandalone, promptInstall, subscribeInstall, wasInstalled } from "./install-store";

function useInstallState() {
  const canPrompt = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false);
  const installed = useSyncExternalStore(subscribeInstall, () => wasInstalled() || isStandalone(), () => false);
  return { canPrompt, installed };
}

/** "Get the app" button. Uses Chrome's install prompt when it's ready; otherwise opens /install. */
export function InstallButton({ className, label = "Get the app" }: { className?: string; label?: string }) {
  const router = useRouter();
  const { canPrompt, installed } = useInstallState();

  if (installed) return null;

  if (!canPrompt) {
    return (
      <Link href="/install" className={cn("inline-flex items-center justify-center gap-2", className)}>
        <Download className="size-5" aria-hidden="true" />
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={cn("inline-flex items-center justify-center gap-2", className)}
      onClick={async () => {
        const result = await promptInstall();
        if (result === "unavailable") router.push("/install");
      }}
    >
      <Download className="size-5" aria-hidden="true" />
      {label}
    </button>
  );
}

export { useInstallState };
