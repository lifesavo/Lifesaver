import { cookies } from "next/headers";
import { connection } from "next/server";
import { answerQuestion, type ChatMessage } from "@/lib/assistant/reply";
import { takeAsk } from "@/lib/db";
import type { PaidPlan } from "@/lib/pricing";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  await connection();
  let payload: { messages?: ChatMessage[]; plan?: PaidPlan; zip?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return json({ ok: false, message: "Send a question." }, 400);
  }
  const messages = (payload.messages ?? []).filter(
    (message) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string",
  );
  const latest = messages.at(-1);
  if (!latest || latest.role !== "user" || latest.content.trim().length < 2) {
    return json({ ok: false, message: "Ask a question first." }, 400);
  }
  const plan: PaidPlan = payload.plan === "premium" || payload.plan === "hand" ? payload.plan : "free";
  const jar = await cookies();
  let clientId = jar.get("lifesaver_ask")?.value;
  if (!clientId) {
    clientId = crypto.randomUUID();
    jar.set("lifesaver_ask", clientId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 400 });
  }
  const quota = takeAsk(clientId, plan !== "free");
  if (!quota.allowed) {
    return json(
      { ok: false, message: "Free includes 3 Ask LifeSaver questions a day. Premium and Lend a Hand are unlimited.", remaining: 0 },
      429,
    );
  }
  const reply = await answerQuestion(messages.slice(-8), { zip: payload.zip ?? "", plan });
  return json({ ok: true, ...reply, remaining: quota.remaining });
}
