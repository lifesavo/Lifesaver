import crypto from "node:crypto";
import { priceIdFor, stripeSecret, type BillingPlan } from "@/lib/billing-config";

/** Minimal Stripe REST client (no SDK). Only used when billing keys are set. */
function form(data: Record<string, string | number | boolean | undefined | null>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) body.append(key, String(value));
  }
  return body;
}

export async function stripeRequest<T>(method: "GET" | "POST", path: string, data?: Record<string, string | number | boolean | undefined | null>, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${stripeSecret()}`,
    "Stripe-Version": "2024-06-20",
  };
  if (method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers,
    body: method === "POST" && data ? form(data) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(json.error?.message || `Stripe error ${response.status}`);
  return json;
}

export async function createCheckoutSession(input: {
  plan: BillingPlan;
  founding: boolean;
  userId: string;
  email: string;
  customerId: string | null;
  siteUrl: string;
}) {
  const price = priceIdFor(input.plan, input.founding);
  return stripeRequest<{ id: string; url: string }>("POST", "/checkout/sessions", {
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": 1,
    client_reference_id: input.userId,
    ...(input.customerId ? { customer: input.customerId } : { customer_email: input.email }),
    "metadata[user_id]": input.userId,
    "metadata[plan]": input.plan,
    "metadata[founding]": input.founding ? "1" : "0",
    "subscription_data[metadata][user_id]": input.userId,
    "subscription_data[metadata][plan]": input.plan,
    success_url: `${input.siteUrl}/pricing?checkout=success`,
    cancel_url: `${input.siteUrl}/pricing?checkout=canceled`,
    allow_promotion_codes: false,
  });
}

export async function createPortalSession(customerId: string, siteUrl: string) {
  return stripeRequest<{ url: string }>("POST", "/billing_portal/sessions", {
    customer: customerId,
    return_url: `${siteUrl}/settings`,
  });
}

/** Verify a Stripe-Signature header (v1 HMAC-SHA256 over "t.payload"). */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, toleranceSec = 300) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((piece) => {
      const index = piece.indexOf("=");
      return [piece.slice(0, index).trim(), piece.slice(index + 1).trim()];
    }),
  ) as Record<string, string>;
  const timestamp = Number(parts.t);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > toleranceSec) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const signatures = header
    .split(",")
    .filter((piece) => piece.trim().startsWith("v1="))
    .map((piece) => piece.trim().slice(3));
  return signatures.some(
    (sig) => sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)),
  );
}

/** Which plan a Stripe price id belongs to. */
export function planForPrice(priceId: string | null | undefined): BillingPlan | null {
  if (!priceId) return null;
  if (priceId === priceIdFor("premium", true) || priceId === priceIdFor("premium", false)) return "premium";
  if (priceId === priceIdFor("hand", true) || priceId === priceIdFor("hand", false)) return "hand";
  return null;
}

export function siteUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && !configured.includes("localhost")) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}
