import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/admin";
import { publishClaimedPost, type PostRow } from "@/lib/social/publisher";

/**
 * The scheduler. Called every minute (Supabase pg_cron, Vercel Cron, or any
 * external "call a URL" service) with:  Authorization: Bearer CRON_SECRET
 *
 * Claims a small batch of due posts at a time and stops early so a run never
 * outlives the function's time limit; anything left over is picked up by the
 * next run.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 5;
const TIME_BUDGET_MS = 45_000;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = request.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

async function run(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServiceClient();
  const started = Date.now();
  const summary = { published: 0, failed: 0, waiting: 0 };

  while (Date.now() - started < TIME_BUDGET_MS) {
    const { data: posts, error } = await admin.rpc("claim_due_posts", { max_posts: BATCH });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!posts?.length) break;

    for (const post of posts as PostRow[]) {
      try {
        const status = await publishClaimedPost(admin, post);
        if (status === "published") summary.published++;
        else if (status === "failed") summary.failed++;
        else summary.waiting++;
      } catch (err) {
        summary.failed++;
        await admin
          .from("posts")
          .update({
            status: "failed",
            locked_at: null,
            error_message: err instanceof Error ? err.message : "Publishing failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", post.id);
      }
    }
    // Posts that went back to "scheduled" to wait for Instagram are due again
    // immediately; stop this run so we don't spin on them.
    if (summary.waiting) break;
  }

  return NextResponse.json({ ok: true, ...summary });
}

export const GET = run;
export const POST = run;
