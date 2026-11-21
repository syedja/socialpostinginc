import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { canPublish, isAdminEmail } from "@/lib/access";
import { publishClaimedPost, type PostRow, type TargetResult } from "@/lib/social/publisher";

export const maxDuration = 60;

/**
 * POST /api/posts/[id]/retry — resend a failed (or partly failed) post to the
 * accounts that failed. Accounts that already got it are not posted to again.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = new URL(request.url).searchParams.get("clientId");

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

  const gate = await canPublish(db, targetUserId);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 402 });

  const admin = createServiceClient();
  const { data: post } = await admin.from("posts").select("*").eq("id", id).eq("user_id", targetUserId).single();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.status !== "failed" && !(post.status === "published" && post.error_message)) {
    return NextResponse.json({ error: "Only failed posts can be retried." }, { status: 400 });
  }

  // Keep successes, drop failures so they're attempted again.
  const kept: Record<string, TargetResult> = {};
  for (const [k, r] of Object.entries((post.results ?? {}) as Record<string, TargetResult>)) {
    if (r.status === "published") kept[k] = r;
  }

  const { data: claimed, error } = await admin
    .from("posts")
    .update({ status: "publishing", locked_at: new Date().toISOString(), attempts: 1, results: kept, error_message: null })
    .eq("id", id)
    .in("status", ["failed", "published"])
    .select()
    .single();
  if (error || !claimed) return NextResponse.json({ error: "This post is already being sent." }, { status: 409 });

  const status = await publishClaimedPost(admin, claimed as PostRow);
  const { data: final } = await admin.from("posts").select("*").eq("id", id).single();
  const message =
    status === "published"
      ? final?.error_message
        ? `Some accounts still failed: ${final.error_message}`
        : "Posted successfully."
      : status === "scheduled"
        ? "Instagram is processing the video. It will finish within a few minutes."
        : `Still failing: ${final?.error_message ?? "unknown error"}`;
  return NextResponse.json({ post: final, message });
}
