/**
 * Platforms we publish to directly, with labels and caption limits.
 *
 * ⚠️ Limits are approximate and change over time. Verify against each
 * platform's current docs periodically.
 */
export interface Platform {
  slug: "facebook" | "instagram" | "google_business";
  label: string;
  limit: number;          // max caption/body characters
  accent: string;         // dot color for UI chips
  requiresMedia: boolean; // can't publish text-only
}

export const PLATFORMS: Platform[] = [
  { slug: "facebook",        label: "Facebook Page",            limit: 63206, accent: "#1877F2", requiresMedia: false },
  { slug: "instagram",       label: "Instagram",                limit: 2200,  accent: "#E1306C", requiresMedia: true },
  { slug: "google_business", label: "Google Business Profile",  limit: 1500,  accent: "#34A853", requiresMedia: false },
];

export function platformBySlug(slug: string) {
  return PLATFORMS.find((p) => p.slug === slug);
}

/** The tightest limit among the selected platforms (drives the main counter). */
export function effectiveLimit(selected: string[]): number | null {
  const limits = selected
    .map((s) => platformBySlug(s)?.limit)
    .filter((n): n is number => typeof n === "number");
  return limits.length ? Math.min(...limits) : null;
}

/** Selected platforms that can't publish without an image or video. */
export function mediaRequiredPlatforms(selected: string[]): Platform[] {
  return selected
    .map((s) => platformBySlug(s))
    .filter((p): p is Platform => !!p && p.requiresMedia);
}
