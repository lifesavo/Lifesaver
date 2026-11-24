import { connection } from "next/server";
import { updateUser, userById, userByStripeCustomer } from "@/lib/accounts";
import { TRIAL_DAYS } from "@/lib/pricing";
import { attachDefaultPaymentMethod, planForPrice, retrieveSetupIntent, verifyStripeSignature } from "@/lib/stripe";
import { isTestEmail, recordUniqueTrackedEvent } from "@/lib/track";

type StripeEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

type Subscription = {
  id: string;
  customer: string;
  status: string;
  trial_end?: number | null;
  default_payment_method?: string | null;
  metadata?: Record<string, string>;
  items?: { data?: { price?: { id?: string } }[] };
};

const PAID = new Set(["active", "trialing", "past_due"]);

function paymentStatusIsTrial(object: Record<string, unknown>) {
  const paymentStatus = object.payment_status as string | undefined;
  return paymentStatus === "no_payment_required" || (Boolean(object.subscription) && paymentStatus !== "paid");
}

function metadataOf(object: Record<string, unknown>) {
  return (object.metadata as Record<string, string> | undefined) ?? {};
}

function countCompletedTrial(args: {
  dedupeId: string;
  aliases?: string[];
  userEmail?: string | null;
  source?: string;
  isTrial: boolean;
}) {
  if (!args.isTrial || isTestEmail(args.userEmail)) return;
  recordUniqueTrackedEvent(args.dedupeId, "trial_checkout_completed", { utm_source: args.source }, args.aliases);
}

function trialEndIso(trialEnd: number | null | undefined) {
  if (!trialEnd) return null;
  return new Date(trialEnd * 1000).toISOString();
}

function applySubscription(sub: Subscription) {
  const user = (sub.metadata?.user_id && userById(sub.metadata.user_id)) || userByStripeCustomer(sub.customer);
  if (!user) return;
  const plan = planForPrice(sub.items?.data?.[0]?.price?.id) ?? (sub.metadata?.plan === "hand" ? "hand" : "premium");
  const ends = trialEndIso(sub.trial_end);
  updateUser(user.id, {
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    subscription_plan: plan,
    plan: PAID.has(sub.status) ? plan : "free",
    ...(ends ? { trial_ends_at: ends } : {}),
    ...(sub.default_payment_method ? { has_payment_method: 1 } : {}),
  });
}

/** Stripe webhook: keeps each account's plan in step with its subscription. */
export async function POST(request: Request) {
  await connection();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return new Response("Billing is not configured.", { status: 503 });
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return new Response("Bad signature.", { status: 400 });
  }
  const event = JSON.parse(payload) as StripeEvent;
  const object = event.data.object;

  if (event.type === "checkout.session.completed") {
    const meta = metadataOf(object);
    const userId = (object.client_reference_id as string) || meta.user_id;
    const user = userId ? userById(userId) : undefined;
    if (object.mode === "setup") {
      const rawSetup = object.setup_intent;
      const setupIntentId = typeof rawSetup === "string" ? rawSetup : (rawSetup as { id?: string } | undefined)?.id;
      if (setupIntentId) {
        try {
          const intent = await retrieveSetupIntent(setupIntentId);
          const rawPm = intent.payment_method;
          const paymentMethodId = typeof rawPm === "string" ? rawPm : (rawPm as { id?: string } | null | undefined)?.id;
          const customerId = (object.customer as string) || intent.customer || user?.stripe_customer_id;
          if (paymentMethodId && customerId) {
            await attachDefaultPaymentMethod(customerId, paymentMethodId, user?.stripe_subscription_id);
            if (user) updateUser(user.id, { stripe_customer_id: customerId, has_payment_method: 1 });
          }
        } catch (error) {
          console.error("trial card setup failed", error);
        }
      }
    } else if (user) {
      const plan = meta.plan === "hand" ? "hand" : "premium";
      const paymentStatus = object.payment_status as string;
      // Trials usually come through as no_payment_required (nothing is due today).
      const status =
        paymentStatus === "paid"
          ? "active"
          : paymentStatus === "no_payment_required" || object.subscription
            ? "trialing"
            : "incomplete";
      const trialFallback = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString();
      updateUser(user.id, {
        stripe_customer_id: (object.customer as string) || user.stripe_customer_id,
        stripe_subscription_id: (object.subscription as string) || user.stripe_subscription_id,
        subscription_status: status,
        subscription_plan: plan,
        plan: status === "incomplete" ? user.plan : plan,
        ...(status === "trialing" ? { trial_ends_at: user.trial_ends_at || trialFallback, has_payment_method: paymentStatus === "paid" ? 1 : 0 } : {}),
      });
    }
    const isTrial = object.mode !== "setup" && (meta.trial === "1" || paymentStatusIsTrial(object));
    const sessionId = object.id as string | undefined;
    const subscriptionId = object.subscription as string | undefined;
    countCompletedTrial({
      dedupeId: `trial_complete:${subscriptionId || sessionId || event.type}`,
      aliases: [sessionId && `trial_complete:${sessionId}`, subscriptionId && `trial_complete:${subscriptionId}`].filter(
        (value): value is string => Boolean(value),
      ),
      userEmail: user?.email,
      source: meta.source,
      isTrial,
    });
  } else if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = object as unknown as Subscription;
    applySubscription(sub);
    if (event.type === "customer.subscription.created" && sub.status === "trialing") {
      const user = (sub.metadata?.user_id && userById(sub.metadata.user_id)) || userByStripeCustomer(sub.customer);
      countCompletedTrial({
        dedupeId: `trial_complete:${sub.id}`,
        userEmail: user?.email,
        source: sub.metadata?.source,
        isTrial: sub.metadata?.trial === "1" || sub.status === "trialing",
      });
    }
  }

  return Response.json({ received: true });
}
