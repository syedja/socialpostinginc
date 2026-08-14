/**
 * Upload-Post integration (server-only). Replaces the previous Ayrshare provider.
 *
 * Model: one Upload-Post *user profile* per Social Posting Inc. customer.
 * The profile username IS the customer's Supabase user id — no extra key to
 * store. White-label linking is included from Upload-Post's Professional
 * plan up.
 *
 * Endpoints verified against the official `upload-post` npm SDK (v2.9.0)
 * and https://docs.upload-post.com as of Aug 2026.
 */

const BASE = "https://api.upload-post.com/api";

function apiKey(): string {
  const key = process.env.UPLOADPOST_API_KEY;
  if (!key) throw new Error("UPLOADPOST_API_KEY is not set");
  return key;
}

async function upFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Apikey ${apiKey()}`,
      ...(init.body && typeof init.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...(init.headers as Record<string, string>),
    },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    success?: boolean;
    message?: string;
    error?: string;
  };
  // 409 on profile creation means "already exists" — callers handle it.
  if (!res.ok && res.status !== 409) {
    throw new Error(
      `Upload-Post ${path} failed (${res.status}): ${data?.message ?? data?.error ?? JSON.stringify(data)}`
    );
  }
  return Object.assign(data, { _status: res.status }) as T;
}

/** Create the customer's Upload-Post profile if it doesn't exist yet. */
export async function ensureProfile(username: string): Promise<void> {
  await upFetch<{ success: boolean; _status?: number }>("/uploadposts/users", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
  // 201 created or 409 already-exists both mean we're good.
}

/**
 * Hosted account-linking page URL (valid ~1h). The customer connects their
 * own social accounts there; we never touch their credentials.
 */
export async function generateLinkUrl(username: string): Promise<string> {
  const data = await upFetch<{ access_url: string }>(
    "/uploadposts/users/generate-jwt",
    {
      method: "POST",
      body: JSON.stringify({
        username,
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/accounts`,
        redirect_button_text: "Return to Social Posting Inc.",
        connect_title: "Connect your accounts",
        connect_description:
          "Link the social profiles you want Social Posting Inc. to publish to.",
      }),
    }
  );
  if (!data.access_url) throw new Error("Upload-Post did not return an access_url");
  return data.access_url;
}

/** Slugs of platforms the customer has actually connected. */
export async function getLinkedAccounts(username: string): Promise<string[]> {
  try {
    const data = await upFetch<{
      success: boolean;
      profile?: { social_accounts?: Record<string, unknown> };
    }>(`/uploadposts/users/${encodeURIComponent(username)}`, { method: "GET" });
    const accounts = data.profile?.social_accounts ?? {};
    return Object.entries(accounts)
      .filter(([, v]) => v !== null && v !== "" && v !== undefined)
      .map(([k]) => k);
  } catch {
    return []; // profile not created yet
  }
}

/**
 * First Facebook Page id for a profile (needed to post to Facebook).
 * Upload-Post's docs show TWO response shapes for this endpoint —
 * {page_id, page_name, profile} and {id, name, account_id} — so accept both.
 * Errors are surfaced, not swallowed, so the user sees the real reason.
 */
type FbPage = { page_id?: string; id?: string; profile?: string };

async function firstFacebookPageId(username: string): Promise<string | null> {
  const parse = (pages: FbPage[] | undefined) =>
    pages?.map((p) => p.page_id ?? p.id).find((v): v is string => !!v) ?? null;

  // Try filtered by profile first.
  const filtered = await upFetch<{ pages?: FbPage[] }>(
    `/uploadposts/facebook/pages?profile=${encodeURIComponent(username)}`,
    { method: "GET" }
  );
  const fromFiltered = parse(filtered.pages);
  if (fromFiltered) return fromFiltered;

  // Fallback: list all pages under the API key and match this profile.
  const all = await upFetch<{ pages?: FbPage[] }>("/uploadposts/facebook/pages", {
    method: "GET",
  });
  const mine = all.pages?.filter((p) => !p.profile || p.profile === username);
  return parse(mine);
}

/** First Pinterest board id for a profile (needed to post to Pinterest). */
async function firstPinterestBoardId(username: string): Promise<string | null> {
  const data = await upFetch<{ boards?: { id?: string; board_id?: string }[] }>(
    `/uploadposts/pinterest/boards?profile=${encodeURIComponent(username)}`,
    { method: "GET" }
  );
  return data.boards?.map((b) => b.id ?? b.board_id).find((v): v is string => !!v) ?? null;
}

const VIDEO_RE = /\.(mp4|mov|webm|m4v)(\?|$)/i;

export interface PublishInput {
  /** Upload-Post profile username = our Supabase user id. */
  user: string;
  content: string;
  /** Upload-Post platform slugs (x, google_business, ...). */
  platforms: string[];
  mediaUrls: string[];
  /** UTC ISO string. Omit to publish immediately. Upload-Post runs the
   *  scheduler server-side — no cron needed on Vercel. */
  scheduledAt?: string | null;
}

export interface PublishResult {
  /** job_id for scheduled posts; request_id for immediate ones. */
  providerId: string;
  kind: "job" | "request";
  /**
   * Only populated for immediate (non-scheduled) publishes that resolved
   * within the poll window. null = still processing, check back later.
   */
  results: PlatformResult[] | null;
}

/**
 * Publish now or schedule. Routes to the correct endpoint based on media:
 * video → /upload, photos → /upload_photos, none → /upload_text.
 */
export async function publishPost(input: PublishInput): Promise<PublishResult> {
  const videos = input.mediaUrls.filter((u) => VIDEO_RE.test(u));
  const photos = input.mediaUrls.filter((u) => !VIDEO_RE.test(u));

  if (videos.length > 1) {
    throw new Error("Only one video per post is supported. Remove the extra videos.");
  }
  if (videos.length === 1 && photos.length > 0) {
    throw new Error("A post can contain either one video or up to 10 photos, not both.");
  }

  const form = new FormData();
  form.append("user", input.user);
  form.append("title", input.content || " ");
  for (const p of input.platforms) form.append("platform[]", p);
  if (input.scheduledAt) {
    // Docs examples use second precision ("2025-09-22T10:00:00Z") — strip ms.
    form.append("scheduled_date", input.scheduledAt.replace(/\.\d{3}Z$/, "Z"));
  }
  form.append("async_upload", "true");

  // Facebook & Pinterest need a target page/board. Auto-select the first one.
  if (input.platforms.includes("facebook")) {
    const pageId = await firstFacebookPageId(input.user);
    if (!pageId) {
      throw new Error(
        "No Facebook Page found. Reconnect Facebook and make sure a Page is linked."
      );
    }
    form.append("facebook_page_id", pageId);
  }
  if (input.platforms.includes("pinterest")) {
    const boardId = await firstPinterestBoardId(input.user);
    if (!boardId) {
      throw new Error(
        "No Pinterest board found. Create a board on Pinterest, then try again."
      );
    }
    form.append("pinterest_board_id", boardId);
  }

  let endpoint: string;
  if (videos.length === 1) {
    endpoint = "/upload";
    form.append("video", videos[0]);
  } else if (photos.length > 0) {
    endpoint = "/upload_photos";
    for (const url of photos.slice(0, 10)) form.append("photos[]", url);
  } else {
    endpoint = "/upload_text";
  }

  const data = await upFetch<{
    success: boolean;
    job_id?: string;
    request_id?: string;
    message?: string;
  }>(endpoint, { method: "POST", body: form });

  if (data.job_id) {
    // Scheduled — nothing has run yet, so there's nothing to poll.
    return { providerId: data.job_id, kind: "job", results: null };
  }
  if (data.request_id) {
    // Immediate publish — wait briefly for the real per-platform outcome
    // instead of trusting "accepted" as "succeeded".
    const resolved = await pollUntilResolved(data.request_id);
    return {
      providerId: data.request_id,
      kind: "request",
      results: resolved?.results ?? null,
    };
  }
  if (data.success) return { providerId: "", kind: "request", results: null };
  throw new Error(data.message ?? "Upload-Post returned an unexpected response");
}

export interface PlatformResult {
  platform: string;
  success: boolean;
  message?: string;
}

/** Poll the real per-platform outcome of an immediate (non-scheduled) publish. */
export async function getUploadStatus(
  requestId: string
): Promise<{ status: string; results: PlatformResult[] }> {
  const data = await upFetch<{
    status: string;
    results?: { platform: string; success: boolean; message?: string; error?: string }[];
  }>(`/uploadposts/status?request_id=${encodeURIComponent(requestId)}`, {
    method: "GET",
  });
  return {
    status: data.status,
    results: (data.results ?? []).map((r) => ({
      platform: r.platform,
      success: r.success,
      message: r.message || r.error,
    })),
  };
}

/**
 * Poll status until it resolves (completed/failed) or we hit maxWaitMs.
 * Bounded conservatively — Vercel Hobby serverless functions cap around 10s,
 * so this never risks the request itself timing out.
 */
async function pollUntilResolved(
  requestId: string,
  maxWaitMs = 7000,
  intervalMs = 1200
): Promise<{ status: string; results: PlatformResult[] } | null> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const s = await getUploadStatus(requestId);
    if (s.status === "completed" || s.status === "failed") return s;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null; // still processing — caller decides how to handle
}

/** Poll the outcome of a SCHEDULED post by job_id (after its scheduled time). */
export async function getJobStatus(
  jobId: string
): Promise<{ status: string; results: PlatformResult[] }> {
  const data = await upFetch<{
    status: string;
    results?: { platform: string; success: boolean; message?: string; error?: string }[];
  }>(`/uploadposts/status?job_id=${encodeURIComponent(jobId)}`, { method: "GET" });
  return {
    status: data.status,
    results: (data.results ?? []).map((r) => ({
      platform: r.platform,
      success: r.success,
      message: r.message || r.error,
    })),
  };
}

/** Cancel a scheduled post by its job_id. */
export async function cancelScheduled(jobId: string): Promise<void> {
  await upFetch(`/uploadposts/schedule/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
  });
}
