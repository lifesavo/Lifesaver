import type { Metadata } from "next";
import { PhoneFrame } from "@/components/phone-frame";
import { AiScreen } from "@/components/ai/ai-screen";

export const metadata: Metadata = {
  title: "Works with your AI",
  description: "Use LifeSaver from ChatGPT, Claude, Gemini, or Grok: cheap gas, what to wear, trip plans, and roadside tips. Copy-paste setup.",
};

export default function AiPage() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://golifesaver.com").replace(/\/$/, "");
  return (
    <PhoneFrame>
      <AiScreen site={site} />
    </PhoneFrame>
  );
}
