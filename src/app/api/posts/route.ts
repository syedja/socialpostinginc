import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { canPublish, isAdminEmail } from "@/lib/access";
import { mediaRequiredPlatforms } from "@/lib/limits";
import { publishClaimedPost, type PostRow } from "@/lib/social/publisher";

export const maxDuration = 60;

/**
 * POST /api/posts
 * body: { content, platforms, mediaUrls, scheduledAt (UTC ISO | null), action, clientId? }
 * action: "draft" | "schedule" | "publish"
 * clientId: admin-only — compose on behalf of a Done-for-you client.
 *
 * "schedule" saves the post; the every-minute scheduler sends it when due.
 * "publish" sends it right away from this request.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json();
  const { content, platforms, mediaUrls, scheduledAt, action, clientId } = body as {
    content: string;
    platforms: string[];
    mediaUrls: string[];
    scheduledAt: string | null;
    action: "draft" | "schedule" | "publish";
    clientId?: string;
  };

  const actingForClient = !!clientId && clientId !== user.id;
  if (actingForClient && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const targetUserId = actingForClient ? clientId! : user.id;
  const db = actingForClient ? createServiceClient() : supabase;

  if (action !== "draft") {
    if (!content?.trim() && !mediaUrls?.length) {
      return NextResponse.json({ error: "Write something or attach media first." }, { status: 400 });
    }
    if (!platforms?.length) {
      return NextResponse.json({ error: "Choose at least one platform." }, { status: 400 });
    }
    if (action === "schedule") {
      if (!scheduledAt) return NextResponse.json({ error: "Pick a date and time to schedule." }, { status: 400 });
      if (new Date(scheduledAt).getTime() < Date.now() - 60_000) {
        return NextResponse.json({ error: "That time is in the past. Pick a future time or publish now." }, { status: 400 });
      }
    }
    const needMedia = mediaRequiredPlatforms(platforms);
    if (needMedia.length && !mediaUrls?.length) {
      return NextResponse.json(
        {
          error: `${needMedia.map((p) => p.label).join(", ")} require${needMedia.length === 1 ? "s" : ""} an image or video. Attach media or deselect ${needMedia.length === 1 ? "it" : "them"}.`,
        },
        { status: 400 }
      );
    }
    const gate = await canPublish(db, targetUserId);
    if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 402 });
  }

  const now = new Date().toISOString();
  const { data: post, error } = await db
    .from("posts")
    .insert({
      user_id: targetUserId,
      content: content ?? "",
      platforms: platforms ?? [],
      media_urls: mediaUrls ?? [],
      status: action === "draft" ? "draft" : action === "publish" ? "publishing" : "scheduled",
      scheduled_at: action === "publish" ? now : scheduledAt,
      locked_at: action === "publish" ? now : null,
      attempts: action === "publish" ? 1 : 0,
    })
    .select()
    .single();
  if (error || !post) return NextResponse.json({ error: error?.message ?? "Could not save" }, { status: 500 });

  if (action !== "publish") return NextResponse.json({ post });

  const admin = createServiceClient();
  const status = await publishClaimedPost(admin, post as PostRow);
  const { data: final } = await admin.from("posts").select("*").eq("id", post.id).single();

  if (status === "failed") {
    return NextResponse.json(
      { post: final, error: final?.error_message ?? "Publishing failed on every selected platform." },
      { status: 502 }
    );
  }
  if (status === "scheduled") {
    return NextResponse.json({
      post: final,
      warning: "Instagram is still processing your video. It will finish posting within a few minutes.",
    });
  }
  return NextResponse.json({
    post: final,
    warning: final?.error_message ? `Posted, but some accounts failed: ${final.error_message}` : undefined,
  });
}
