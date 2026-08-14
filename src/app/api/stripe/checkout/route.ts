import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, PLANS, type PlanKey } from "@/lib/stripe";

/**
 * POST /api/stripe/checkout — start a subscription checkout.
 *
 * The free trial now starts at signup (see migration 003), not here — so
 * this only carries over whatever's LEFT of that local trial, rather than
 * granting a second fresh 14 days. Someone converting on trial day 10 gets
 * 4 more days before Stripe starts billing; someone already on a real
 * subscription (switching plans) gets none.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { plan } = (await request.json()) as { plan: PlanKey };
  const priceId = PLANS[plan]?.priceId();
  if (!priceId) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  let trialDays = 0;
  if (!sub?.stripe_customer_id && sub?.status === "trialing" && sub.current_period_end) {
    const msLeft = new Date(sub.current_period_end).getTime() - Date.now();
    trialDays = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: sub?.stripe_customer_id ?? undefined,
    customer_email: sub?.stripe_customer_id ? undefined : user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
      metadata: { user_id: user.id, plan },
    },
    metadata: { user_id: user.id, plan },
    success_url: `${appUrl}/billing?success=1`,
    cancel_url: `${appUrl}/billing?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
