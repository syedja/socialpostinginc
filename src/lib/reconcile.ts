import type { SupabaseClient } from "@supabase/supabase-js";
import { getJobStatus, getUploadStatus } from "@/lib/social-provider";

/**
 * Auto-reconcile: for any of this user's "scheduled" posts whose time has
 * passed, ask Upload-Post what actually happened and update our record to
 * published/failed with real per-platform errors.
 *
 * Called on dashboard/calendar load. Bounded to a few posts per page view and
 * fully fault-tolerant — a provider hiccup must never break page rendering.
 */
export async function reconcileDuePosts(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    const { data: due } = await supabase
      .from("posts")
      .select("id, provider_post_id, provider_kind, published_at")
      .eq("user_id", userId)
      .eq("status", "scheduled")
      .not("provider_post_id", "is", null)
      .lte("scheduled_at", new Date().toISOString())
      .limit(5);

    if (!due?.length) return;

    await Promise.all(
      due.map(async (post) => {
        try {
          const status =
            post.provider_kind === "job"
              ? await getJobStatus(post.provider_post_id!)
              : await getUploadStatus(post.provider_post_id!);

          if (status.status !== "completed" && status.status !== "failed") return;

          const failed = status.results.filter((r) => !r.success);
          const allFailed = status.results.length > 0 && failed.length === status.results.length;
          const newStatus = status.status === "failed" || allFailed ? "failed" : "published";

          await supabase
            .from("posts")
            .update({
              status: newStatus,
              published_at:
                newStatus === "published"
                  ? post.published_at ?? new Date().toISOString()
                  : null,
              error_message: failed.length
                ? failed.map((f) => `${f.platform}: ${f.message ?? "failed"}`).join("; ")
                : null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", post.id)
            .eq("user_id", userId);
        } catch {
          // One post failing to reconcile shouldn't affect the others.
        }
      })
    );
  } catch {
    // Never let reconciliation break page rendering.
  }
}
