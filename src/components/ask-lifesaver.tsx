"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import type { ToolCard } from "@/lib/assistant/tools";
import { useProfile } from "@/lib/profile";

type Bubble = { role: "user" | "assistant"; content: string; cards?: ToolCard[]; mode?: string };

const prompts = [
  "I blew a tire on I-70",
  "Where's the cheapest gas near me?",
  "Should I take Uber or Lyft?",
  "Plan a 3-day trip to Nashville for 2, $800",
  "Find me the cheapest trip to Los Angeles",
  "Help me cut my bills",
  "Build a budget from $3200 take-home",
  "My mower won't start",
];

const tabbed = new Set([
  "/home",
  "/bills",
  "/deals",
  "/savings",
  "/hand",
  "/rides",
  "/pricing",
  "/fuel",
  "/travel",
  "/nights",
  "/plan",
  "/weather",
]);

export function AskLifeSaver() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [messages, setMessages] = useState<Bubble[]>([
    {
      role: "assistant",
      content: "Ask me about gas, rides, a trip plan, bills, a budget, or a mower that will not start.",
      mode: "demo",
    },
  ]);

  const lifted = tabbed.has(pathname);
  const plan = profile?.plan ?? "free";

  async function send(text: string) {
    const question = text.trim();
    if (!question || pending) return;
    const history = [...messages, { role: "user" as const, content: question }];
    setMessages(history);
    setDraft("");
    setPending(true);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          plan,
          zip: profile?.zip ?? "",
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        text?: string;
        cards?: ToolCard[];
        mode?: string;
        remaining?: number | null;
      };
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.ok === false ? data.message || "Try again." : data.text || "I could not answer that.",
          cards: data.cards,
          mode: data.mode,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "I could not reach Ask LifeSaver. Try again." },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center">
      <div className={`pointer-events-auto relative w-full max-w-[430px] ${lifted ? "h-36" : "h-20"}`}>
        {open && (
          <section
            aria-label="Ask LifeSaver"
            className={`absolute right-3 left-3 flex max-h-[70dvh] flex-col overflow-hidden rounded-3xl border-2 border-ink bg-white shadow-[6px_6px_0_#2a1038] ${
              lifted ? "bottom-24" : "bottom-16"
            }`}
          >
            <header className="flex items-center justify-between bg-ink px-3 py-2 text-white">
              <div>
                <p className="font-serif text-lg leading-none">Ask LifeSaver</p>
                <p className="text-[11px] text-lime">
                  {messages.some((message) => message.mode === "openai" || message.mode === "xai")
                    ? "Live model"
                    : "Demo mode. No live model is connected."}
                  {plan === "free" && remaining != null ? ` ${remaining} left today.` : ""}
                  {plan !== "free" ? " Unlimited on your plan." : ""}
                </p>
              </div>
              <button type="button" className="rounded-full p-2" onClick={() => setOpen(false)} aria-label="Close Ask LifeSaver">
                <X className="size-4" />
              </button>
            </header>
            <div className="flex gap-2 overflow-x-auto border-b px-3 py-2">
              {prompts.map((prompt) => (
                <button key={prompt} type="button" className="shrink-0 rounded-full bg-lime px-3 py-1 text-xs font-bold text-ink" onClick={() => void send(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={message.role === "user" ? "text-right" : "text-left"}>
                  <p className={`inline-block max-w-[95%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${message.role === "user" ? "bg-ink text-white" : "bg-muted text-ink"}`}>
                    {message.content}
                  </p>
                  {message.cards?.map((card) => (
                    <a
                      key={card.title + card.body}
                      href={card.href || "#"}
                      {...(card.href?.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                      onClick={() => {
                        if (card.href?.startsWith("/")) setOpen(false);
                      }}
                      className="mt-1 block rounded-2xl border px-3 py-2 text-left text-sm">
                      <span className="block font-semibold">{card.title}</span>
                      <span className="text-muted-foreground">{card.body}</span>
                    </a>
                  ))}
                </div>
              ))}
              {pending && <p className="text-sm text-muted-foreground">Thinking…</p>}
            </div>
            <form
              className="flex gap-2 border-t p-2"
              onSubmit={(event) => {
                event.preventDefault();
                void send(draft);
              }}
            >
              <label className="sr-only" htmlFor="ask-lifesaver">
                Question
              </label>
              <input
                id="ask-lifesaver"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask LifeSaver"
                className="h-11 min-w-0 flex-1 rounded-full border px-3 text-base"
              />
              <button type="submit" className="h-11 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground" disabled={pending}>
                Send
              </button>
            </form>
          </section>
        )}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={`absolute right-3 inline-flex h-14 items-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-white shadow-[4px_4px_0_#d6ff4a] ${
            lifted ? "bottom-20" : "bottom-4"
          }`}
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          Ask LifeSaver
        </button>
      </div>
    </div>
  );
}
