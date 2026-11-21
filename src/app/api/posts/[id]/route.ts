import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { canPublish, isAdminEmail } from "@/lib/access";
import { mediaRequiredPlatforms } from "@/lib/limits";
import { publishClaimedPost, type PostRow } from "@/lib/social/publisher";

export const maxDuration = 60;

async function resolveActor(clientId?: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };

  const actingForClient = !!clientId && clientId !== user.id;
  if (actingForClient && !isAdminEmail(user.email)) {
    return { error: NextResponse.json({ error: "Not authorized" }, { status: 403 }) };
  }
  return {
    user,
    targetUserId: actingForClient ? clientId! : user.id,
    db: actingForClient ? createServiceClient() : supabase,
  };
}

/**
 * PATCH /api/posts/[id] — edit a draft or scheduled post. Since our own
 * scheduler sends posts, editing is just updating the row.
 * body.action "schedule" turns a draft into a scheduled post; "publish"
 * sends it right away.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { content, platforms, mediaUrls, scheduledAt, clientId, action } = body as {
    content: string;
    platforms: string[];
    mediaUrls: string[];
    scheduledAt: string | null;
    clientId?: string;
    action?: "draft" | "schedule" | "publish";
  };

  const actor = await resolveActor(clientId);
  if ("error" in actor) return actor.error;
  const { db, targetUserId } = actor;

  const { data: post } = await db.from("posts").select("*").eq("id", id).eq("user_id", targetUserId).single();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.status === "published" || post.status === "publishing") {
    return NextResponse.json({ error: "This post has already been sent and can't be edited." }, { status: 400 });
  }

  const publishNow = action === "publish";
  const willSchedule = !publishNow && (action === "schedule" || (post.status === "scheduled" && action !== "draft"));
  if (willSchedule || publishNow) {
    if (willSchedule && !scheduledAt) {
      return NextResponse.json({ error: "Pick a date and time to schedule." }, { status: 400 });
    }
    if (!content?.trim() && !mediaUrls?.length) {
      return NextResponse.json({ error: "Write something or attach media first." }, { status: 400 });
    }
    if (!platforms?.length) return NextResponse.json({ error: "Choose at least one platform." }, { status: 400 });
    const gate = await canPublish(db, targetUserId);
    if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 402 });
    const needMedia = mediaRequiredPlatforms(platforms ?? []);
    if (needMedia.length && !mediaUrls?.length) {
      return NextResponse.json(
        { error: `${needMedia.map((p) => p.label).join(", ")} require media. Attach an image or video.` },
        { status: 400 }
      );
    }
  }

  const { data, error } = await db
    .from("posts")
    .update({
      content,
      platforms,
      media_urls: mediaUrls ?? [],
      scheduled_at: publishNow ? new Date().toISOString() : scheduledAt,
      status: publishNow ? "publishing" : willSchedule ? "scheduled" : post.status === "failed" ? "draft" : post.status,
      locked_at: publishNow ? new Date().toISOString() : null,
      results: {},
      attempts: publishNow ? 1 : 0,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", targetUserId)
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Could not save" }, { status: 500 });
  if (!publishNow) return NextResponse.json({ post: data });

  const admin = createServiceClient();
  const status = await publishClaimedPost(admin, data as PostRow);
  const { data: final } = await admin.from("posts").select("*").eq("id", id).single();
  if (status === "failed") {
    return NextResponse.json({ post: final, error: final?.error_message ?? "Publishing failed." }, { status: 502 });
  }
  return NextResponse.json({
    post: final,
    warning:
      status === "scheduled"
        ? "Instagram is still processing your video. It will finish posting within a few minutes."
        : final?.error_message
          ? `Posted, but some accounts failed: ${final.error_message}`
          : undefined,
  });
}

/** DELETE /api/posts/[id] — delete a draft or cancel a scheduled post. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = new URL(request.url).searchParams.get("clientId");

  const actor = await resolveActor(clientId);
  if ("error" in actor) return actor.error;
  const { db, targetUserId } = actor;

  const { data: post } = await db.from("posts").select("status").eq("id", id).eq("user_id", targetUserId).single();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.status === "publishing") {
    return NextResponse.json({ error: "This post is being sent right now. Try again in a minute." }, { status: 409 });
  }

  const { error } = await db.from("posts").delete().eq("id", id).eq("user_id", targetUserId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
