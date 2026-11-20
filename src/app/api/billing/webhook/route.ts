import { connection } from "next/server";
import { updateUser, userById, userByStripeCustomer } from "@/lib/accounts";
import { planForPrice, verifyStripeSignature } from "@/lib/stripe";

type StripeEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

type Subscription = {
  id: string;
  customer: string;
  status: string;
  metadata?: Record<string, string>;
  items?: { data?: { price?: { id?: string } }[] };
};

const PAID = new Set(["active", "trialing", "past_due"]);

function applySubscription(sub: Subscription) {
  const user = (sub.metadata?.user_id && userById(sub.metadata.user_id)) || userByStripeCustomer(sub.customer);
  if (!user) return;
  const plan = planForPrice(sub.items?.data?.[0]?.price?.id) ?? (sub.metadata?.plan === "hand" ? "hand" : "premium");
  updateUser(user.id, {
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    subscription_plan: plan,
    plan: PAID.has(sub.status) ? plan : "free",
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
    const userId = (object.client_reference_id as string) || (object.metadata as Record<string, string> | undefined)?.user_id;
    const user = userId ? userById(userId) : undefined;
    if (user) {
      const plan = (object.metadata as Record<string, string> | undefined)?.plan === "hand" ? "hand" : "premium";
      const paymentStatus = object.payment_status as string;
      // Trials usually come through as no_payment_required (nothing is due today).
      const status =
        paymentStatus === "paid"
          ? "active"
          : paymentStatus === "no_payment_required" || object.subscription
            ? "trialing"
            : "incomplete";
      updateUser(user.id, {
        stripe_customer_id: (object.customer as string) || user.stripe_customer_id,
        stripe_subscription_id: (object.subscription as string) || user.stripe_subscription_id,
        subscription_status: status,
        subscription_plan: plan,
        plan: status === "incomplete" ? user.plan : plan,
      });
    }
  } else if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    applySubscription(object as unknown as Subscription);
  }

  return Response.json({ received: true });
}
