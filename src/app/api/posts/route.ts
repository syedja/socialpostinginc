import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { publishPost, ensureProfile } from "@/lib/social-provider";
import { canPublish, isAdminEmail } from "@/lib/access";
import { mediaRequiredPlatforms } from "@/lib/limits";

/**
 * POST /api/posts
 * body: { content, platforms, mediaUrls, scheduledAt (UTC ISO | null), action, clientId? }
 * action: "draft" | "schedule" | "publish"
 * clientId: admin-only — compose on behalf of a Managed-plan client.
 *
 * Scheduling is delegated to Upload-Post's scheduled_date, so no cron job is
 * required (Vercel Hobby plan compatible).
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

  // Admin acting on behalf of a client (Managed plan). All DB writes then use
  // the service client, scoped explicitly to the client's user id.
  const actingForClient = !!clientId && clientId !== user.id;
  if (actingForClient && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const targetUserId = actingForClient ? clientId! : user.id;
  const db = actingForClient ? createServiceClient() : supabase;

  // ── Validation ──────────────────────────────────────────
  if (action !== "draft") {
    if (!content?.trim() && !mediaUrls?.length) {
      return NextResponse.json({ error: "Write something or attach media first." }, { status: 400 });
    }
    if (!platforms?.length) {
      return NextResponse.json({ error: "Choose at least one platform." }, { status: 400 });
    }
    if (action === "schedule" && !scheduledAt) {
      return NextResponse.json({ error: "Pick a date and time to schedule." }, { status: 400 });
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
    // Plan gate: the person being posted for needs an active/trialing plan.
    const gate = await canPublish(db, targetUserId);
    if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 402 });
  }

  // ── Draft: no provider call ─────────────────────────────
  if (action === "draft") {
    const { data, error } = await db
      .from("posts")
      .insert({
        user_id: targetUserId,
        content: content ?? "",
        platforms: platforms ?? [],
        media_urls: mediaUrls ?? [],
        status: "draft",
        scheduled_at: scheduledAt,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ post: data });
  }

  // ── Schedule / publish via Upload-Post ──────────────────
  try {
    await ensureProfile(targetUserId);
    const result = await publishPost({
      user: targetUserId,
      content,
      platforms,
      mediaUrls: mediaUrls ?? [],
      scheduledAt: action === "schedule" ? scheduledAt : null,
    });

    // Scheduled posts haven't run yet — nothing to verify, always "scheduled".
    // Immediate posts: check what actually happened per platform.
    let finalStatus: "scheduled" | "published" | "failed" = "scheduled";
    let errorMessage: string | null = null;
    let warning: string | null = null;

    if (action === "publish") {
      if (result.results === null) {
        // Upload-Post hadn't resolved within our poll window. Mark published
        // optimistically (most posts do succeed) but flag it for a manual check.
        finalStatus = "published";
        errorMessage =
          "Still processing on Upload-Post's side — check app.upload-post.com if it doesn't appear shortly.";
      } else {
        const failed = result.results.filter((r) => !r.success);
        if (failed.length === result.results.length) {
          finalStatus = "failed";
          errorMessage = failed.map((f) => `${f.platform}: ${f.message ?? "failed"}`).join("; ");
        } else if (failed.length > 0) {
          finalStatus = "published";
          errorMessage = failed.map((f) => `${f.platform}: ${f.message ?? "failed"}`).join("; ");
          warning = `Posted to ${result.results.length - failed.length} of ${result.results.length} platforms. ${errorMessage}`;
        } else {
          finalStatus = "published";
        }
      }
    }

    const { data, error } = await db
      .from("posts")
      .insert({
        user_id: targetUserId,
        content,
        platforms,
        media_urls: mediaUrls ?? [],
        status: finalStatus,
        scheduled_at: action === "schedule" ? scheduledAt : null,
        published_at: finalStatus === "published" ? new Date().toISOString() : null,
        provider_post_id: result.providerId || null,
        provider_kind: result.kind,
        error_message: errorMessage,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (finalStatus === "failed") {
      return NextResponse.json(
        { post: data, error: errorMessage ?? "Publishing failed on every selected platform." },
        { status: 502 }
      );
    }
    return NextResponse.json({ post: data, warning: warning ?? undefined });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publishing failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
