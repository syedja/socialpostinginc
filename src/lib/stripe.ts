import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Lazy init so `next build` doesn't crash when env vars are absent. */
export function stripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export { PLANS, planName, type PlanKey } from "@/lib/plans";
