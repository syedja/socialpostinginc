import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink, Card, StatusBadge } from "@/components/ui";
import { formatInTz } from "@/lib/utils";
import { platformBySlug } from "@/lib/limits";
import { PostActions } from "@/components/PostActions";
import { reconcileDuePosts } from "@/lib/reconcile";

export const metadata = { title: "Dashboard — Social Posting Inc." };

const TABS = [
  { key: "scheduled", label: "Scheduled" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
  { key: "failed", label: "Failed" },
] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "scheduled";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sync any past-due scheduled posts with what actually happened on
  // Upload-Post before rendering, so statuses are never stale.
  await reconcileDuePosts(supabase, user!.id);

  const [{ data: profile }, { data: posts }, counts] = await Promise.all([
    supabase.from("profiles").select("timezone, full_name").eq("id", user!.id).single(),
    supabase
      .from("posts")
      .select("*")
      .eq("user_id", user!.id)
      .eq("status", tab)
      .order(tab === "published" ? "published_at" : "scheduled_at", {
        ascending: tab === "scheduled",
        nullsFirst: false,
      })
      .limit(50),
    Promise.all(
      TABS.map(async (t) => {
        const { count } = await supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("status", t.key);
        return [t.key, count ?? 0] as const;
      })
    ),
  ]);

  const tz = profile?.timezone ?? "America/Chicago";
  const countMap = Object.fromEntries(counts);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {profile?.full_name ? `Hi, ${profile.full_name.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-muted">Everything you have planned, in one place.</p>
        </div>
        <ButtonLink href="/compose">+ New post</ButtonLink>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-line" role="tablist">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard?tab=${t.key}`}
            role="tab"
            aria-selected={tab === t.key}
            className={
              tab === t.key
                ? "border-b-2 border-brand px-4 py-2 text-sm font-medium text-brand"
                : "border-b-2 border-transparent px-4 py-2 text-sm text-muted hover:text-ink"
            }
          >
            {t.label} <span className="text-faint">({countMap[t.key]})</span>
          </Link>
        ))}
      </div>

      {/* Posts */}
      <div className="mt-5 space-y-3">
        {!posts?.length && (
          <Card className="p-10 text-center">
            <p className="text-sm text-muted">
              {tab === "scheduled" && "No scheduled posts yet. Create one and pick a date."}
              {tab === "published" && "Nothing published yet. Your live posts will appear here."}
              {tab === "draft" && "No drafts. Save a post as a draft to finish it later."}
              {tab === "failed" && "Nothing failed — that's the goal. Failed posts show up here with a reason so you can fix and retry."}
            </p>
            <ButtonLink href="/compose" variant="secondary" className="mt-4">
              Create a post
            </ButtonLink>
          </Card>
        )}

        {posts?.map((post) => (
          <Card key={post.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={post.status} />
                  {post.scheduled_at && post.status === "scheduled" && (
                    <span className="text-xs text-muted">{formatInTz(post.scheduled_at, tz)}</span>
                  )}
                  {post.published_at && post.status === "published" && (
                    <span className="text-xs text-muted">{formatInTz(post.published_at, tz)}</span>
                  )}
                </div>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-ink">
                  {post.content || <span className="italic text-faint">No text — media only</span>}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {post.platforms.map((slug: string) => {
                    const p = platformBySlug(slug);
                    return (
                      <span
                        key={slug}
                        className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-2 py-0.5 text-xs text-muted"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: p?.accent ?? "#999" }}
                          aria-hidden
                        />
                        {p?.label ?? slug}
                      </span>
                    );
                  })}
                  {post.media_urls?.length > 0 && (
                    <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-muted">
                      {post.media_urls.length} media
                    </span>
                  )}
                </div>
                {post.error_message && (
                  <p className="mt-2 text-xs text-danger">{post.error_message}</p>
                )}
              </div>
              <PostActions id={post.id} status={post.status} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
