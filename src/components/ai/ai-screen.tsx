"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy } from "lucide-react";
import { TokenManager } from "@/components/ai/token-manager";

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative mt-2">
      <pre className="overflow-x-auto rounded-2xl bg-ink p-3 pr-12 text-xs leading-5 whitespace-pre-wrap text-lime">{text}</pre>
      <button
        type="button"
        aria-label="Copy"
        className="absolute top-2 right-2 rounded-full bg-white/15 p-2 text-white"
        onClick={() => void navigator.clipboard?.writeText(text).then(() => setCopied(true))}
      >
        <Copy className="size-3.5" aria-hidden="true" />
        <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
      </button>
      {copied && <p className="mt-1 text-xs text-muted-foreground">Copied.</p>}
    </div>
  );
}

export function AiScreen({ site }: { site: string }) {
  const mcp = `${site}/api/mcp`;
  const openapi = `${site}/openapi.json`;
  const llms = `${site}/llms.txt`;
  const guides = [
    {
      name: "ChatGPT",
      color: "bg-[#10a37f] text-white",
      steps: [
        "Custom GPT: in ChatGPT, Explore GPTs → Create → Configure → Create new action → Import from URL, and paste:",
        openapi,
        "Authentication: None works for gas, weather, trips, roadside, and giveaway. For your saved trips, pick API key → Bearer and paste your token from below.",
        "If your ChatGPT plan offers custom connectors (MCP), you can add this server URL instead:",
        mcp,
      ],
    },
    {
      name: "Claude",
      color: "bg-[#d97757] text-white",
      steps: [
        "Claude app: Settings → Connectors → Add custom connector, and paste the URL. Public tools work right away:",
        mcp,
        "Claude Code, with your saved trips (replace YOUR_TOKEN):",
        `claude mcp add --transport http lifesaver ${mcp} --header "Authorization: Bearer YOUR_TOKEN"`,
      ],
    },
    {
      name: "Gemini",
      color: "bg-[#4285f4] text-white",
      steps: [
        "Gemini CLI: add this to ~/.gemini/settings.json (drop the headers line if you only want public tools):",
        JSON.stringify({ mcpServers: { lifesaver: { httpUrl: mcp, headers: { Authorization: "Bearer YOUR_TOKEN" } } } }, null, 2),
        "Gemini app: paste this into a chat so it knows the tools:",
        `Read ${llms} and use LifeSaver's public endpoints to help me.`,
      ],
    },
    {
      name: "Grok",
      color: "bg-black text-white",
      steps: [
        "Grok app: paste this into a chat:",
        `Read ${llms} and use LifeSaver's public endpoints to help me.`,
        "Developers using a tool that supports remote MCP servers can point it at:",
        mcp,
      ],
    },
  ];
  const isCode = (s: string) => s.startsWith("http") || s.startsWith("claude ") || s.startsWith("{") || s.startsWith("Read ");

  return (
    <div className="space-y-4 pb-10">
      <header className="rounded-3xl bg-gradient-to-br from-[#e01470] via-[#6d28d9] to-[#0891b2] px-5 py-6 text-white">
        <p className="text-xs font-bold tracking-wide text-lime uppercase">Works with your AI</p>
        <h1 className="mt-1 font-serif text-4xl leading-tight">Run LifeSaver from the AI you already trust.</h1>
        <p className="mt-2 text-sm text-white/85">
          ChatGPT, Claude, Gemini, or Grok can check gas prices, tell you what to wear, plan a trip, and walk you through a flat tire, using LifeSaver.
        </p>
      </header>

      <section className="rounded-3xl bg-lime p-4 text-ink">
        <h2 className="font-serif text-2xl">What your AI can do</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>⛽ Find the cheapest gas near a ZIP</li>
          <li>🧥 Tell you what to wear today</li>
          <li>🧳 Plan a day-by-day trip, and save it with your token</li>
          <li>🛞 Roadside tips: flat tire, jump start, out of gas, lockout</li>
          <li>💵 Check this week&apos;s free $100 giveaway</li>
        </ul>
        <p className="mt-2 text-xs">No token needed except for your saved trips.</p>
      </section>

      {guides.map((guide) => (
        <section key={guide.name} className="rounded-3xl border-2 border-ink/10 bg-card p-4">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${guide.color}`}>{guide.name}</span>
          <ol className="mt-2 space-y-1 text-sm">
            {guide.steps.map((step) => (isCode(step) ? <CopyBlock key={step} text={step} /> : <li key={step}>{step}</li>))}
          </ol>
        </section>
      ))}

      <TokenManager />

      <section className="rounded-3xl border border-dashed p-4 text-sm">
        <h2 className="font-semibold">For developers</h2>
        <ul className="mt-1 space-y-1">
          <li>MCP (Streamable HTTP): <a className="underline" href={mcp}>{mcp}</a></li>
          <li>OpenAPI 3.1: <a className="underline" href={openapi}>{openapi}</a></li>
          <li>llms.txt: <a className="underline" href={llms}>{llms}</a></li>
          <li>Manifest: <a className="underline" href={`${site}/.well-known/ai-plugin.json`}>/.well-known/ai-plugin.json</a></li>
        </ul>
      </section>

      <p className="text-xs text-muted-foreground">
        ChatGPT, Claude, Gemini, and Grok are trademarks of OpenAI, Anthropic, Google, and xAI. LifeSaver is not affiliated with, endorsed by, or a partner of
        any of them. Menu names in those apps can change. Your AI only sees what you ask it to look up, plus your saved trips if you give it a token.
      </p>
      <Link href="/home" className="block text-center text-sm font-semibold text-primary">Back to LifeSaver</Link>
    </div>
  );
}
