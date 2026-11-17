/** Plan catalogue. Safe to import in browser code (no Stripe SDK). */
export const PLANS = {
  starter: {
    name: "Starter",
    price: 19,
    blurb: "For owners who want to post themselves, fast.",
    priceId: () => process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER ?? "",
    features: [
      "Facebook, Instagram and Google Business Profile",
      "Unlimited scheduled posts",
      "AI captions written for your business",
      "Share any post to WhatsApp in one tap",
      "1 user",
    ],
  },
  growth: {
    name: "Growth",
    price: 49,
    blurb: "More locations and pages, plus a monthly check-in.",
    priceId: () => process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH ?? "",
    features: [
      "Everything in Starter",
      "Multiple Pages, Instagram accounts and locations",
      "Priority email support",
      "Monthly 15-minute strategy call",
    ],
  },
  managed: {
    name: "Done for you",
    price: 299,
    blurb: "We write, design and post for you. You just approve.",
    priceId: () => process.env.NEXT_PUBLIC_STRIPE_PRICE_MANAGED ?? "",
    features: [
      "A post every day, written and designed by our team",
      "Facebook, Instagram and Google Business Profile",
      "Built from your photos, specials and news",
      "Monthly report and strategy call",
      "Growth app included",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/** Display name for any stored plan key, including older ones. */
export function planName(key: string | null | undefined): string {
  if (!key) return "No plan yet";
  if (key in PLANS) return PLANS[key as PlanKey].name;
  if (key === "self_serve") return "Self-Serve (legacy)";
  return key;
}
