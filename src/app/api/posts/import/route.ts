import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/posts/import — saves the week of posts a visitor generated on
 * /try (kept in their browser until they signed up) as drafts.
 * body: { posts: { caption: string }[] }  (max 14, captions capped)
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { posts?: { caption?: unknown }[] };
  const rows = (body.posts ?? [])
    .slice(0, 14)
    .map((p) => (typeof p.caption === "string" ? p.caption.trim().slice(0, 2200) : ""))
    .filter(Boolean)
    .map((content) => ({
      user_id: user.id,
      content,
      platforms: ["facebook", "instagram", "google_business"],
      media_urls: [],
      status: "draft",
      source: "try",
    }));
  if (!rows.length) return NextResponse.json({ imported: 0 });

  // Don't import the same week twice (e.g. two tabs).
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("source", "try");
  if ((count ?? 0) > 0) return NextResponse.json({ imported: 0 });

  const { error } = await supabase.from("posts").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported: rows.length });
}
