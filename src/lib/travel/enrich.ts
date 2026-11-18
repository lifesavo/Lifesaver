import type { Itinerary } from "@/lib/travel/itinerary";

/**
 * Optional: when an LLM key is set, ask the model to rewrite slot titles and details with
 * real, specific places. The rule-based plan is always the fallback.
 */
export function enrichmentAvailable() {
  return Boolean(process.env.XAI_API_KEY || process.env.OPENAI_API_KEY);
}

type ModelDay = { theme?: string; morning?: { title?: string; detail?: string }; afternoon?: { title?: string; detail?: string }; evening?: { title?: string; detail?: string } };

export async function enrichItinerary(plan: Itinerary): Promise<Itinerary> {
  const xai = process.env.XAI_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  const key = xai || openai;
  if (!key) return plan;
  const url = xai ? "https://api.x.ai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
  const model = xai ? process.env.XAI_MODEL || "grok-3" : process.env.OPENAI_MODEL || "gpt-4o-mini";
  const { input } = plan;
  const prompt = [
    `Plan a ${plan.days.length}-day trip to ${input.destination} from ${input.start} to ${input.end} for ${input.travelers} traveler(s).`,
    input.origin ? `They leave from ${input.origin}.` : "",
    input.budget ? `Total budget is $${input.budget}. Favor free and low-cost picks.` : "Favor free and low-cost picks.",
    input.interests.length ? `Interests: ${input.interests.join(", ")}.` : "",
    "Day 1 morning is arrival. The last day's evening is heading home.",
    'Reply with JSON only: {"days":[{"theme":"...","morning":{"title":"...","detail":"..."},"afternoon":{...},"evening":{...}}]}.',
    "Use real, well-known places. Titles under 60 characters, details under 140. Never state prices as facts.",
  ].join(" ");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are LifeSaver's trip planner. Output strict JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) return plan;
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = JSON.parse(body.choices?.[0]?.message?.content ?? "{}") as { days?: ModelDay[] };
    if (!Array.isArray(parsed.days) || !parsed.days.length) return plan;
    const clean = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
    const days = plan.days.map((day, index) => {
      const next = parsed.days?.[index];
      if (!next) return day;
      return {
        ...day,
        theme: clean(next.theme, 60) || day.theme,
        slots: day.slots.map((slot) => {
          const m = next[slot.time];
          const title = clean(m?.title, 80);
          if (!title) return slot;
          return {
            ...slot,
            title,
            detail: clean(m?.detail, 200) || slot.detail,
            href: `https://www.google.com/maps/search/${encodeURIComponent(`${title} ${input.destination}`)}`,
          };
        }),
      };
    });
    return { ...plan, days, enriched: true };
  } catch {
    return plan;
  } finally {
    clearTimeout(timer);
  }
}
