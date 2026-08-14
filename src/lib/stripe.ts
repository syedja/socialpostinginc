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

export const PLANS = {
  self_serve: {
    name: "Self-Serve",
    price: 19,
    priceId: () => process.env.NEXT_PUBLIC_STRIPE_PRICE_SELF_SERVE ?? "",
    features: [
      "Connect all 8 supported platforms",
      "Unlimited scheduled posts",
      "Calendar view & media library",
      "Post from any device",
      "Email support",
    ],
  },
  managed: {
    name: "Managed",
    price: 199,
    priceId: () => process.env.NEXT_PUBLIC_STRIPE_PRICE_MANAGED ?? "",
    features: [
      "12 posts per month, written & scheduled for you",
      "Up to 3 platforms of your choice",
      "Content built from your photos & updates",
      "Monthly posting calendar you approve first",
      "One revision round per post",
      "Priority email support",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
