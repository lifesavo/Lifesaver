import crypto from "node:crypto";
import { priceIdFor, stripeSecret, type BillingPlan } from "@/lib/billing-config";
import {
  FOUNDING_HAND_LABEL,
  FOUNDING_PREMIUM_LABEL,
  HAND_PRICE_LABEL,
  PREMIUM_PRICE_LABEL,
  trialDisclosure,
} from "@/lib/pricing";

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

export type CheckoutSessionInput = {
  plan: BillingPlan;
  founding: boolean;
  userId: string;
  email: string;
  customerId: string | null;
  siteUrl: string;
  /** When set (Premium trial), card is collected up front and the first charge waits this many days. */
  trialPeriodDays?: number;
};

function priceLabelFor(plan: BillingPlan, founding: boolean) {
  if (plan === "premium") return founding ? FOUNDING_PREMIUM_LABEL : PREMIUM_PRICE_LABEL;
  return founding ? FOUNDING_HAND_LABEL : HAND_PRICE_LABEL;
}

/** Body sent to Stripe Checkout. Exported so it can be checked without calling Stripe. */
export function checkoutSessionParams(input: CheckoutSessionInput) {
  const price = priceIdFor(input.plan, input.founding);
  const trialDays = input.trialPeriodDays && input.trialPeriodDays > 0 ? input.trialPeriodDays : 0;
  const trial = trialDays > 0;
  const successPath = trial ? "/home?checkout=success" : "/pricing?checkout=success";
  const cancelPath = trial ? "/start?trial=1&checkout=canceled" : "/pricing?checkout=canceled";
  const params: Record<string, string | number | boolean | undefined | null> = {
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
    success_url: `${input.siteUrl}${successPath}`,
    cancel_url: `${input.siteUrl}${cancelPath}`,
    allow_promotion_codes: false,
  };
  if (trial) {
    // Collect the card now so Stripe can charge automatically when the trial ends.
    params["subscription_data[trial_period_days]"] = trialDays;
    params.payment_method_collection = "always";
    params["custom_text[submit][message]"] = trialDisclosure(priceLabelFor(input.plan, input.founding));
  }
  return params;
}

export async function createCheckoutSession(input: CheckoutSessionInput) {
  return stripeRequest<{ id: string; url: string }>("POST", "/checkout/sessions", checkoutSessionParams(input));
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
