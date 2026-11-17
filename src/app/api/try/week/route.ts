import { NextResponse } from "next/server";
import { NICHES, generateWeek, type NicheKey } from "@/lib/week";

/**
 * POST /api/try/week — public, no login. Generates a week of sample posts.
 * body: { name, niche, town }
 *
 * Light abuse protection: per-IP limit held in memory. It resets when the
 * server restarts and isn't shared between Vercel instances, so it slows
 * down casual abuse rather than stopping a determined attacker. AI spend is
 * also capped by max_tokens per request.
 */
const hits = new Map<string, { n: number; reset: number }>();
const LIMIT = 8; // per IP per hour

function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + 3600_000 });
    return false;
  }
  h.n++;
  return h.n > LIMIT;
}

export async function POST(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (limited(ip)) {
    return NextResponse.json({ error: "You've made a lot of previews. Try again in an hour, or sign up to keep going." }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: unknown; niche?: unknown; town?: unknown };
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const town = typeof body.town === "string" ? body.town.trim().slice(0, 60) : "";
  const niche = NICHES.some((n) => n.key === body.niche) ? (body.niche as NicheKey) : null;
  if (!name || !niche) {
    return NextResponse.json({ error: "Enter your business name and pick what kind of business it is." }, { status: 400 });
  }

  const posts = await generateWeek({ name, niche, town });
  return NextResponse.json({ posts });
}
