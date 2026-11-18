import type { Metadata } from "next";
import Link from "next/link";
import { PhoneFrame } from "@/components/phone-frame";
import { TokenManager } from "@/components/ai/token-manager";
import { AccountPanel } from "@/components/account/account-panel";

export const metadata: Metadata = {
  title: "Settings",
  description: "Your LifeSaver account, signing in on other devices, and personal access tokens for your AI.",
};

export default function SettingsPage() {
  return (
    <PhoneFrame>
      <div className="space-y-4 pb-10">
        <header>
          <h1 className="font-serif text-3xl tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your own AI. Setup steps for ChatGPT, Claude, Gemini, and Grok are on{" "}
            <Link href="/ai" className="font-semibold text-primary underline">Works with your AI</Link>.
          </p>
        </header>
        <AccountPanel />
        <TokenManager />
        <Link href="/home" className="block text-center text-sm font-semibold text-primary">Back to LifeSaver</Link>
      </div>
    </PhoneFrame>
  );
}
