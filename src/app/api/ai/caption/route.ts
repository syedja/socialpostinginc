import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { complete } from "@/lib/ai";
import { platformBySlug } from "@/lib/limits";

/**
 * POST /api/ai/caption — signed-in helper for the composer.
 * body: { idea?: string, current?: string, platforms?: string[] }
 * Writes a caption from an idea, or improves the current draft.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { idea?: string; current?: string; platforms?: string[] };
  const idea = (body.idea ?? "").slice(0, 500);
  const current = (body.current ?? "").slice(0, 2200);
  if (!idea.trim() && !current.trim()) {
    return NextResponse.json({ error: "Type a few words about your post first." }, { status: 400 });
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const limits = (body.platforms ?? [])
    .map((p) => platformBySlug(p))
    .filter(Boolean)
    .map((p) => `${p!.label} (max ${p!.limit} characters)`)
    .join(", ");

  const system =
    "You write social media captions for a small local business. Warm, specific, plain English. " +
    "At most 2 hashtags and 1 emoji. Never invent prices, awards, statistics, addresses or phone numbers. " +
    "Reply with the caption text only, no quotes or preamble.";
  const prompt =
    `Business: ${profile?.full_name || "a local business"}\n` +
    (limits ? `Posting to: ${limits}\n` : "") +
    (current.trim() ? `Improve this draft, keeping its facts:\n${current}\n` : `Write a caption about: ${idea}\n`) +
    "Keep it under 400 characters.";

  try {
    const caption = await complete(system, prompt, 400);
    return NextResponse.json({ caption });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI writing failed" }, { status: 503 });
  }
}
