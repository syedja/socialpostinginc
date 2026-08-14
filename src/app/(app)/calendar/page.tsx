import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { platformBySlug } from "@/lib/limits";
import { reconcileDuePosts } from "@/lib/reconcile";

export const metadata = { title: "Calendar — Social Posting Inc." };

/** Day-key ("YYYY-MM-DD") of a UTC timestamp in the user's timezone. */
function dayKeyInTz(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function timeInTz(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await reconcileDuePosts(supabase, user!.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user!.id)
    .single();
  const tz = profile?.timezone ?? "America/Chicago";

  // Month to show: ?m=YYYY-MM or the current month in the user's tz.
  const nowKey = dayKeyInTz(new Date().toISOString(), tz); // YYYY-MM-DD
  const monthStr = m && /^\d{4}-\d{2}$/.test(m) ? m : nowKey.slice(0, 7);
  const [year, month] = monthStr.split("-").map(Number);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0 = Sunday

  const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;

  // Fetch posts in a wide window around the month, then bucket by tz day-key.
  const windowStart = new Date(Date.UTC(year, month - 2, 25)).toISOString();
  const windowEnd = new Date(Date.UTC(year, month, 7)).toISOString();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, platforms, status, scheduled_at, published_at")
    .eq("user_id", user!.id)
    .in("status", ["scheduled", "published"])
    .or(
      `and(scheduled_at.gte.${windowStart},scheduled_at.lte.${windowEnd}),and(published_at.gte.${windowStart},published_at.lte.${windowEnd})`
    );

  const byDay = new Map<string, NonNullable<typeof posts>>();
  for (const post of posts ?? []) {
    const ts = post.status === "published" ? post.published_at : post.scheduled_at;
    if (!ts) continue;
    const key = dayKeyInTz(ts, tz);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(post);
  }

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <div className="flex items-center gap-2">
          <Link href={`/calendar?m=${prev}`} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm hover:bg-canvas" aria-label="Previous month">←</Link>
          <span className="min-w-36 text-center text-sm font-medium">{monthLabel}</span>
          <Link href={`/calendar?m=${next}`} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm hover:bg-canvas" aria-label="Next month">→</Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">Times shown in {tz}.</p>

      <Card className="mt-5 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-canvas text-center text-xs font-medium text-muted">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-24 border-b border-r border-line bg-canvas/50" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayPosts = byDay.get(key) ?? [];
            const isToday = key === nowKey;
            return (
              <div key={key} className="min-h-24 border-b border-r border-line p-1.5">
                <span
                  className={
                    isToday
                      ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-medium text-white"
                      : "inline-flex h-6 w-6 items-center justify-center text-xs text-muted"
                  }
                >
                  {day}
                </span>
                <div className="mt-1 space-y-1">
                  {dayPosts.slice(0, 3).map((post) => {
                    const ts = post.status === "published" ? post.published_at! : post.scheduled_at!;
                    const first = platformBySlug(post.platforms[0]);
                    return (
                      <Link
                        key={post.id}
                        href={post.status === "scheduled" ? `/compose?id=${post.id}` : "/dashboard?tab=published"}
                        className={
                          post.status === "published"
                            ? "block truncate rounded bg-success-soft px-1.5 py-0.5 text-[11px] text-success"
                            : "block truncate rounded bg-brand-soft px-1.5 py-0.5 text-[11px] text-brand hover:opacity-80"
                        }
                        title={post.content}
                      >
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ backgroundColor: first?.accent ?? "#999" }} aria-hidden />
                        {timeInTz(ts, tz)} {post.content?.slice(0, 24) || "Media post"}
                      </Link>
                    );
                  })}
                  {dayPosts.length > 3 && (
                    <p className="px-1.5 text-[11px] text-faint">+{dayPosts.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
