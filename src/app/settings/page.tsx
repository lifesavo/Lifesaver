import type { Metadata } from "next";
import Link from "next/link";
import { PhoneFrame } from "@/components/phone-frame";
import { TokenManager } from "@/components/ai/token-manager";

export const metadata: Metadata = {
  title: "Settings",
  description: "Create and revoke personal access tokens so your own AI can use your LifeSaver trips.",
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
        <TokenManager />
        <Link href="/home" className="block text-center text-sm font-semibold text-primary">Back to LifeSaver</Link>
      </div>
    </PhoneFrame>
  );
}
