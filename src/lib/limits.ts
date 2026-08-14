/**
 * Platform metadata: Upload-Post slugs, labels, and character limits.
 *
 * ⚠️ Limits are approximate and drift over time (X in particular varies by
 * account tier). Verify against each platform's current docs periodically.
 */
export interface Platform {
  slug: string;          // Upload-Post platform identifier
  label: string;
  limit: number;         // max caption/body characters
  accent: string;        // brand-ish dot color for UI chips
  requiresMedia: boolean; // platform can't accept text-only posts
}

export const PLATFORMS: Platform[] = [
  { slug: "facebook",        label: "Facebook Page",   limit: 63206, accent: "#1877F2", requiresMedia: false },
  { slug: "instagram",       label: "Instagram",       limit: 2200,  accent: "#E1306C", requiresMedia: true },
  { slug: "linkedin",        label: "LinkedIn",        limit: 3000,  accent: "#0A66C2", requiresMedia: false },
  { slug: "x",               label: "X (Twitter)",     limit: 280,   accent: "#111111", requiresMedia: false },
  { slug: "threads",         label: "Threads",         limit: 500,   accent: "#333333", requiresMedia: false },
  { slug: "pinterest",       label: "Pinterest",       limit: 500,   accent: "#E60023", requiresMedia: true },
  { slug: "tiktok",          label: "TikTok",          limit: 2200,  accent: "#00C2B3", requiresMedia: true },
  { slug: "google_business", label: "Google Business", limit: 1500,  accent: "#34A853", requiresMedia: false },
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
