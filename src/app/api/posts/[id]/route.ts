import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { cancelScheduled, publishPost, ensureProfile } from "@/lib/social-provider";
import { isAdminEmail } from "@/lib/access";
import { mediaRequiredPlatforms } from "@/lib/limits";

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
 * PATCH /api/posts/[id] — edit a draft or scheduled post.
 * Upload-Post's schedule API only lets us change the date in place, so for
 * content edits we cancel the scheduled job and re-create it (same UX result).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { content, platforms, mediaUrls, scheduledAt, clientId } = body as {
    content: string;
    platforms: string[];
    mediaUrls: string[];
    scheduledAt: string | null;
    clientId?: string;
  };

  const actor = await resolveActor(clientId);
  if ("error" in actor) return actor.error;
  const { db, targetUserId } = actor;

  const { data: post } = await db
    .from("posts")
    .select("*")
    .eq("id", id)
    .eq("user_id", targetUserId)
    .single();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.status === "published") {
    return NextResponse.json({ error: "Published posts can't be edited here." }, { status: 400 });
  }

  const needMedia = mediaRequiredPlatforms(platforms ?? []);
  if (post.status === "scheduled" && needMedia.length && !mediaUrls?.length) {
    return NextResponse.json(
      { error: `${needMedia.map((p) => p.label).join(", ")} require media. Attach an image or video.` },
      { status: 400 }
    );
  }

  let providerPostId: string | null = post.provider_post_id;
  let providerKind: string | null = post.provider_kind;

  if (post.status === "scheduled") {
    try {
      if (providerPostId && post.provider_kind === "job") {
        await cancelScheduled(providerPostId);
      }
      await ensureProfile(targetUserId);
      const result = await publishPost({
        user: targetUserId,
        content,
        platforms,
        mediaUrls: mediaUrls ?? [],
        scheduledAt,
      });
      providerPostId = result.providerId || null;
      providerKind = result.kind;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const { data, error } = await db
    .from("posts")
    .update({
      content,
      platforms,
      media_urls: mediaUrls ?? [],
      scheduled_at: scheduledAt,
      provider_post_id: providerPostId,
      provider_kind: providerKind,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", targetUserId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}

/** DELETE /api/posts/[id] — remove a draft or cancel a scheduled post. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");

  const actor = await resolveActor(clientId);
  if ("error" in actor) return actor.error;
  const { db, targetUserId } = actor;

  const { data: post } = await db
    .from("posts")
    .select("*")
    .eq("id", id)
    .eq("user_id", targetUserId)
    .single();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  if (post.status === "scheduled" && post.provider_post_id && post.provider_kind === "job") {
    try {
      await cancelScheduled(post.provider_post_id);
    } catch {
      // If the job already ran or was removed on the provider side,
      // still delete our record.
    }
  }

  const { error } = await db.from("posts").delete().eq("id", id).eq("user_id", targetUserId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
