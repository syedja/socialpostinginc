import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadPublishTargets,
  markNeedsReconnect,
  updateAccessToken,
  type AccountWithTokens,
} from "@/lib/social/accounts";
import {
  MetaError,
  VIDEO_RE,
  createInstagramContainer,
  instagramContainerStatus,
  publishInstagramContainer,
  publishToFacebookPage,
} from "@/lib/social/meta";
import { GoogleError, publishGoogleLocalPost, refreshGoogleToken } from "@/lib/social/google";
import { platformBySlug } from "@/lib/limits";

/**
 * The publishing engine. Given a post that has been claimed (status
 * "publishing"), sends it to every enabled connected account of each selected
 * platform and records a result per account in posts.results.
 *
 * Instagram videos take a while to process on Meta's side. Instead of waiting
 * inside one request, we save the container id, put the post back to
 * "scheduled" (its time is already in the past) and the next scheduler run
 * picks it up and finishes it. Accounts that already succeeded are never
 * re-sent.
 */

export interface TargetResult {
  platform: string;
  name: string;
  status: "processing" | "published" | "failed";
  externalId?: string;
  url?: string;
  containerId?: string;
  error?: string;
  at: string;
}

export interface PostRow {
  id: string;
  user_id: string;
  content: string;
  platforms: string[];
  media_urls: string[];
  results: Record<string, TargetResult> | null;
  attempts: number;
  published_at: string | null;
}

const MAX_ATTEMPTS = 15; // ≈ 15 minutes of waiting for Instagram video processing

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function friendly(platform: string, err: unknown): string {
  let msg = errMessage(err);
  if (platform === "instagram" && /image|format|aspect/i.test(msg)) {
    msg += " (Instagram accepts JPEG photos with an aspect ratio between 4:5 and 1.91:1.)";
  }
  return msg;
}

async function freshGoogleToken(admin: SupabaseClient, acct: AccountWithTokens): Promise<string> {
  const expires = acct.expiresAt ? new Date(acct.expiresAt).getTime() : 0;
  if (expires - Date.now() > 2 * 60 * 1000) return acct.accessToken;
  if (!acct.refreshToken) throw new GoogleError("Google connection expired. Reconnect Google Business Profile.", true);
  const t = await refreshGoogleToken(acct.refreshToken);
  const expiresAt = new Date(Date.now() + t.expires_in * 1000).toISOString();
  await updateAccessToken(admin, acct.id, t.access_token, expiresAt);
  return t.access_token;
}

async function publishOneTarget(
  admin: SupabaseClient,
  post: PostRow,
  acct: AccountWithTokens,
  previous: TargetResult | undefined
): Promise<TargetResult> {
  const base = { platform: acct.platform, name: acct.name, at: new Date().toISOString() };
  const media = post.media_urls ?? [];

  try {
    if (acct.platform === "facebook") {
      const r = await publishToFacebookPage({
        pageId: acct.external_id,
        token: acct.accessToken,
        message: post.content,
        mediaUrls: media,
      });
      return { ...base, status: "published", externalId: r.id, url: r.url };
    }

    if (acct.platform === "instagram") {
      let containerId = previous?.containerId;
      if (!containerId) {
        containerId = await createInstagramContainer({
          igId: acct.external_id,
          token: acct.accessToken,
          caption: post.content,
          mediaUrls: media,
        });
        // Photos are usually ready within a few seconds.
        if (!media.some((u) => VIDEO_RE.test(u))) await new Promise((r) => setTimeout(r, 3000));
      }
      const status = await instagramContainerStatus(containerId, acct.accessToken);
      if (status.code === "FINISHED") {
        const r = await publishInstagramContainer(acct.external_id, acct.accessToken, containerId);
        return { ...base, status: "published", externalId: r.id, url: r.url, containerId };
      }
      if (status.code === "PUBLISHED") {
        return { ...base, status: "published", containerId };
      }
      if (status.code === "ERROR" || status.code === "EXPIRED") {
        return {
          ...base,
          status: "failed",
          containerId,
          error: `Instagram couldn't process the media (${status.code}${status.detail ? `: ${status.detail}` : ""}).`,
        };
      }
      return { ...base, status: "processing", containerId };
    }

    if (acct.platform === "google_business") {
      const token = await freshGoogleToken(admin, acct);
      const image = media.find((u) => !VIDEO_RE.test(u));
      const r = await publishGoogleLocalPost({
        locationPath: acct.external_id,
        token,
        summary: post.content,
        imageUrl: image,
      });
      return { ...base, status: "published", externalId: r.id, url: r.url };
    }

    return { ...base, status: "failed", error: `Unsupported platform: ${acct.platform}` };
  } catch (err) {
    const tokenInvalid =
      (err instanceof MetaError && err.tokenInvalid) || (err instanceof GoogleError && err.tokenInvalid);
    if (tokenInvalid) {
      await markNeedsReconnect(admin, acct.id);
      return {
        ...base,
        status: "failed",
        error: `${platformBySlug(acct.platform)?.label ?? acct.platform} connection expired. Reconnect it on the Connected accounts page, then retry.`,
      };
    }
    return { ...base, status: "failed", error: friendly(acct.platform, err) };
  }
}

/** Publish a claimed post and write the outcome. Returns the final post status. */
export async function publishClaimedPost(
  admin: SupabaseClient,
  post: PostRow
): Promise<"published" | "failed" | "scheduled"> {
  const results: Record<string, TargetResult> = { ...(post.results ?? {}) };
  const targets = await loadPublishTargets(admin, post.user_id, post.platforms);

  // Platforms that were selected but have no enabled, connected account.
  const missing = post.platforms.filter((p) => !targets.some((t) => t.platform === p));
  for (const p of missing) {
    results[`missing:${p}`] = {
      platform: p,
      name: platformBySlug(p)?.label ?? p,
      status: "failed",
      error: `No ${platformBySlug(p)?.label ?? p} account is connected and switched on.`,
      at: new Date().toISOString(),
    };
  }

  for (const acct of targets) {
    const prev = results[acct.id];
    // Finished accounts are never re-sent. (The Retry button clears failures first.)
    if (prev?.status === "published" || prev?.status === "failed") continue;
    results[acct.id] = await publishOneTarget(admin, post, acct, prev);
  }

  const all = Object.values(results);
  const processing = all.filter((r) => r.status === "processing");
  const published = all.filter((r) => r.status === "published");

  let status: "published" | "failed" | "scheduled";
  if (processing.length && post.attempts < MAX_ATTEMPTS) {
    status = "scheduled"; // come back next minute to finish Instagram video
  } else {
    for (const r of processing) {
      r.status = "failed";
      r.error = "Instagram took too long to process the video. Try a shorter MP4 (H.264).";
    }
    status = published.length ? "published" : "failed";
  }

  const errors = Object.values(results)
    .filter((r) => r.status === "failed")
    .map((r) => `${platformBySlug(r.platform)?.label ?? r.platform} (${r.name}): ${r.error}`);

  await admin
    .from("posts")
    .update({
      status,
      results,
      locked_at: null,
      published_at: status === "published" ? post.published_at ?? new Date().toISOString() : null,
      error_message: status === "scheduled" ? null : errors.length ? errors.join(" · ") : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", post.id);

  return status;
}
