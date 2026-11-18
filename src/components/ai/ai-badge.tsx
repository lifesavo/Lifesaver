import Link from "next/link";
import { Bot } from "lucide-react";

export function AiBadge({ className = "" }: { className?: string }) {
  return (
    <Link href="/ai" className={`inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-lime ${className}`}>
      <Bot className="size-4" aria-hidden="true" /> Works with your AI
    </Link>
  );
}

export function AiSection({ dark = false }: { dark?: boolean }) {
  return (
    <section className={`rounded-3xl p-5 ${dark ? "bg-ink text-white" : "border-2 border-ink/10 bg-card"}`}>
      <p className={`text-xs font-bold tracking-wide uppercase ${dark ? "text-lime" : "text-primary"}`}>Works with your AI</p>
      <h2 className="mt-1 font-serif text-3xl leading-tight">Use LifeSaver from ChatGPT, Claude, Gemini, or Grok.</h2>
      <p className={`mt-2 text-sm ${dark ? "text-white/80" : "text-muted-foreground"}`}>
        Ask the AI you already trust for cheap gas, what to wear, a trip plan, or roadside tips, powered by LifeSaver. Copy-paste setup, about a minute.
      </p>
      <Link href="/ai" className="mt-3 inline-flex h-11 items-center rounded-full bg-lime px-4 text-sm font-bold text-ink">
        Set it up
      </Link>
    </section>
  );
}
