import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getJobStatus, getUploadStatus } from "@/lib/social-provider";
import { isAdminEmail } from "@/lib/access";

/**
 * POST /api/posts/[id]/refresh
 * Reconciles a post with Upload-Post's actual outcome. Solves the "scheduled
 * post never updates" gap: after the scheduled time passes, this asks the
 * provider what really happened and updates our status to published/failed
 * with the real per-platform error messages.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const actingForClient = !!clientId && clientId !== user.id;
  if (actingForClient && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const targetUserId = actingForClient ? clientId! : user.id;
  const db = actingForClient ? createServiceClient() : supabase;

  const { data: post } = await db
    .from("posts")
    .select("*")
    .eq("id", id)
    .eq("user_id", targetUserId)
    .single();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (!post.provider_post_id) {
    return NextResponse.json({ error: "This post has no provider record to check." }, { status: 400 });
  }

  try {
    const status =
      post.provider_kind === "job"
        ? await getJobStatus(post.provider_post_id)
        : await getUploadStatus(post.provider_post_id);

    // pending/queued/processing → nothing to change yet.
    if (status.status !== "completed" && status.status !== "failed") {
      return NextResponse.json({
        post,
        providerStatus: status.status,
        message:
          post.status === "scheduled" && post.scheduled_at && new Date(post.scheduled_at) > new Date()
            ? "Still scheduled — its time hasn't arrived yet."
            : `Provider reports: ${status.status}. Check again shortly.`,
      });
    }

    const failed = status.results.filter((r) => !r.success);
    const allFailed = status.results.length > 0 && failed.length === status.results.length;
    const newStatus = status.status === "failed" || allFailed ? "failed" : "published";
    const errorMessage = failed.length
      ? failed.map((f) => `${f.platform}: ${f.message ?? "failed"}`).join("; ")
      : null;

    const { data: updated, error } = await db
      .from("posts")
      .update({
        status: newStatus,
        published_at: newStatus === "published" ? post.published_at ?? new Date().toISOString() : null,
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", targetUserId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const message =
      newStatus === "failed"
        ? `Publishing failed: ${errorMessage}`
        : errorMessage
          ? `Published, but some platforms failed: ${errorMessage}`
          : "Confirmed: published successfully on all selected platforms.";

    return NextResponse.json({ post: updated, providerStatus: status.status, message });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not check status";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
