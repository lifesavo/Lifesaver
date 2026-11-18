import { runTool, type ToolCard } from "@/lib/assistant/tools";
import { detectRoadside } from "@/lib/roadside/info";
import { detectPro, detectRide } from "@/lib/help/types";
import type { PaidPlan } from "@/lib/pricing";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type AssistantReply = {
  mode: "demo" | "openai" | "xai";
  text: string;
  cards: ToolCard[];
};

const toolDefs = [
  { name: "cheapest_gas", description: "Find the cheapest gas stations near a ZIP.", parameters: { zip: "string" } },
  { name: "compare_rides", description: "Compare sample Uber and Lyft prices.", parameters: {} },
  { name: "cheapest_trip", description: "Search a trip from, to, dates, and travelers.", parameters: { from: "string", to: "string", depart: "string", returnDate: "string", travelers: "number" } },
  { name: "plan_trip", description: "Build a day-by-day travel itinerary with budget split, packing list, and price-comparison links. Pass the user's full trip request in request (destination, dates, travelers, budget, interests).", parameters: { request: "string" } },
  { name: "roadside_help", description: "Someone is stranded: flat or blown tire, breakdown, out of gas, locked out, dead battery, or accident. Returns safety steps and links into Roadside Help.", parameters: { issue: "string", message: "string" } },
  { name: "weather_alerts", description: "Active National Weather Service alerts near the user's ZIP or a named place.", parameters: { place: "string" } },
  { name: "get_a_hand_request", description: "The user needs a ride (type=ride, dropoff) or help at home or work from a pro or a neighbor (type=pro, category: plumber, electrician, hvac, handyman, roofing, cleaning, lawn_snow, moving, pest, locksmith, auto_mechanic, other). Links into Get a Hand.", parameters: { type: "string", dropoff: "string", category: "string" } },
  { name: "cut_bills", description: "List sample subscriptions worth canceling.", parameters: {} },
  { name: "local_deals", description: "Show sample local deals.", parameters: {} },
  { name: "build_budget", description: "Build a simple monthly budget from take-home income.", parameters: { income: "number" } },
  { name: "get_a_hand", description: "DIY tips, then a helper request for Lend a Hand members.", parameters: { description: "string" } },
];

function pickTool(message: string): { name: string; args: Record<string, unknown> } {
  const text = message.toLowerCase();
  const roadside = detectRoadside(message);
  if (roadside) return { name: "roadside_help", args: { issue: roadside, message } };
  const ride = detectRide(message);
  if (ride) return { name: "get_a_hand_request", args: { type: "ride", dropoff: ride.dropoff } };
  const pro = detectPro(message);
  if (pro) return { name: "get_a_hand_request", args: { type: "pro", category: pro } };
  if (/\b(weather )?(alerts?|warnings?|watch(es)?|advisor(y|ies))\b/.test(text) && /weather|alert|storm|tornado|warning|advisor|flood|snow|ice|wind|heat/.test(text)) {
    const place = message.match(/\b(?:in|for|near|at)\s+([A-Za-z][A-Za-z .'-]+(?:,\s*[A-Za-z]{2})?|\d{5})/)?.[1]?.trim();
    return { name: "weather_alerts", args: { place } };
  }
  const income = text.match(/\$?\s*(\d{3,6})/);
  if (/budget|take-home|paycheck|i make|i earn/.test(text)) {
    return { name: "build_budget", args: { income: income ? Number(income[1]) : 0 } };
  }
  if (/uber|lyft|doordash|eats/.test(text)) return { name: "compare_rides", args: {} };
  if (/gas|fuel|gallon/.test(text)) {
    const zip = text.match(/\b(\d{5})\b/);
    return { name: "cheapest_gas", args: { zip: zip?.[1] } };
  }
  const wantsPlan =
    /itinerar|vacation|getaway|road trip|honeymoon|things to do in/.test(text) ||
    (/\bplan\b/.test(text) && /trip|travel|visit|weekend|days?\b|nights?\b/.test(text)) ||
    (/\btrip\b/.test(text) && !/cheap|flight|hotel|fare|car rental|price/.test(text));
  if (wantsPlan) return { name: "plan_trip", args: { request: message } };
  if (/flight|hotel|trip|travel|car rental/.test(text)) {
    const to = text.match(/\bto\s+([a-z][a-z .'-]{2,30})/i)?.[1]?.trim() ?? "";
    return { name: "cheapest_trip", args: { from: "SFO", to, depart: "2026-12-04", returnDate: "2026-12-08", travelers: 1 } };
  }
  if (/mower|won't start|wont start|hand|repair|assembl|move the/.test(text)) {
    return { name: "get_a_hand", args: { description: message } };
  }
  if (/deal|grocery|lunch/.test(text)) return { name: "local_deals", args: {} };
  if (/bill|subscription|cancel|spotify|netflix/.test(text)) return { name: "cut_bills", args: {} };
  return { name: "cut_bills", args: {} };
}

async function demoReply(message: string, context: { zip: string; plan: PaidPlan }): Promise<AssistantReply> {
  const tool = pickTool(message);
  const result = await runTool(tool.name, tool.args, context);
  return {
    mode: "demo",
    text: result.text,
    cards: result.cards,
  };
}

type LlmToolCall = { id: string; name: string; arguments: string };

async function complete(url: string, key: string, model: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Model request failed (${response.status}).`);
  return response.json() as Promise<{
    choices?: Array<{
      message?: { content?: string | null; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> };
    }>;
  }>;
}

async function modelReply(
  mode: "openai" | "xai",
  messages: ChatMessage[],
  context: { zip: string; plan: PaidPlan },
): Promise<AssistantReply> {
  const key = mode === "xai" ? process.env.XAI_API_KEY : process.env.OPENAI_API_KEY;
  const url = mode === "xai" ? "https://api.x.ai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
  const model = mode === "xai" ? process.env.XAI_MODEL || "grok-3" : process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!key) return demoReply(messages.at(-1)?.content ?? "", context);

  const tools = toolDefs.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: { type: "object", properties: Object.fromEntries(Object.keys(tool.parameters).map((key) => [key, { type: "string" }])), additionalProperties: false },
    },
  }));

  const chat: Array<Record<string, unknown>> = [
    {
      role: "system",
      content: `You are Ask LifeSaver. Help people save money. If someone is stranded or had an accident, call roadside_help first. Use tools for gas, rides, trips, trip itineraries (plan_trip), bills, deals, budgets, and helper requests. ZIP is ${context.zip || "unknown"}. Plan is ${context.plan}. Never call an estimated or sample price a live price. Keep replies short.`,
    },
    ...messages.slice(-8).map((message) => ({ role: message.role, content: message.content })),
  ];

  const first = await complete(url, key, model, { model, messages: chat, tools, tool_choice: "auto" });
  const message = first.choices?.[0]?.message;
  const calls: LlmToolCall[] = (message?.tool_calls ?? []).map((call) => ({
    id: call.id,
    name: call.function.name,
    arguments: call.function.arguments,
  }));
  if (!calls.length) {
    return { mode, text: message?.content || "I can look up gas, rides, trips, bills, or a helper.", cards: [] };
  }

  const cards: ToolCard[] = [];
  const toolMessages = [];
  for (const call of calls.slice(0, 3)) {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(call.arguments) as Record<string, unknown>;
    } catch {
      args = {};
    }
    const result = await runTool(call.name, args, context);
    cards.push(...result.cards);
    toolMessages.push({ role: "tool", tool_call_id: call.id, content: result.text });
  }
  const second = await complete(url, key, model, {
    model,
    messages: [...chat, message, ...toolMessages],
  });
  return {
    mode,
    text: second.choices?.[0]?.message?.content || cards.map((card) => card.title).join("\n"),
    cards,
  };
}

export async function answerQuestion(
  messages: ChatMessage[],
  context: { zip: string; plan: PaidPlan },
): Promise<AssistantReply> {
  const latest = messages.at(-1)?.content ?? "";
  try {
    if (process.env.XAI_API_KEY) return await modelReply("xai", messages, context);
    if (process.env.OPENAI_API_KEY) return await modelReply("openai", messages, context);
  } catch {
    const fallback = await demoReply(latest, context);
    return { ...fallback, text: fallback.text };
  }
  return demoReply(latest, context);
}
