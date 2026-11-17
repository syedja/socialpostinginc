/**
 * Facebook Pages + Instagram (professional accounts linked to a Page) via the
 * Meta Graph API. Server-only.
 *
 * Endpoints checked against Meta's docs (Nov 2026):
 *  - Page text post:   POST /{page-id}/feed            message
 *  - Page photo:       POST /{page-id}/photos          url, message
 *  - Page multi-photo: POST /{page-id}/photos published=false (each), then
 *                      POST /{page-id}/feed attached_media[n]={"media_fbid":id}
 *  - Page video:       POST /{page-id}/videos          file_url, description
 *  - IG container:     POST /{ig-id}/media             image_url | video_url+media_type=REELS,
 *                      carousel items with is_carousel_item=true, parent media_type=CAROUSEL
 *  - IG status:        GET  /{container-id}?fields=status_code
 *  - IG publish:       POST /{ig-id}/media_publish     creation_id
 */

export const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v26.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

/** Default permissions requested when connecting. Override with META_SCOPES. */
export const META_SCOPES = (
  process.env.META_SCOPES ||
  "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,business_management"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export class MetaError extends Error {
  constructor(
    message: string,
    public code?: number,
    public subcode?: number,
    public tokenInvalid = false
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | undefined>;

async function graph<T>(path: string, method: "GET" | "POST", params: Params): Promise<T> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) body.append(k, String(v));
  const url = method === "GET" ? `${GRAPH}${path}?${body}` : `${GRAPH}${path}`;
  const res = await fetch(url, {
    method,
    body: method === "POST" ? body : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: { message?: string; code?: number; error_subcode?: number; error_user_msg?: string };
  };
  if (!res.ok || data.error) {
    const e = data.error ?? {};
    // 190 = invalid/expired token; 102 = session invalid
    const tokenInvalid = e.code === 190 || e.code === 102;
    throw new MetaError(e.error_user_msg || e.message || `Meta API error (${res.status})`, e.code, e.error_subcode, tokenInvalid);
  }
  return data;
}

// ── OAuth ───────────────────────────────────────────────

export function metaAuthUrl(redirectUri: string, state: string): string {
  const appId = process.env.META_APP_ID;
  if (!appId) throw new Error("META_APP_ID is not set");
  const p = new URLSearchParams({ client_id: appId, redirect_uri: redirectUri, state, response_type: "code" });
  // "Facebook Login for Business" apps use a configuration id instead of a scope list.
  if (process.env.META_LOGIN_CONFIG_ID) p.set("config_id", process.env.META_LOGIN_CONFIG_ID);
  else p.set("scope", META_SCOPES.join(","));
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${p}`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<string> {
  const appId = process.env.META_APP_ID!;
  const secret = process.env.META_APP_SECRET;
  if (!secret) throw new Error("META_APP_SECRET is not set");
  const short = await graph<{ access_token: string }>("/oauth/access_token", "GET", {
    client_id: appId,
    client_secret: secret,
    redirect_uri: redirectUri,
    code,
  });
  // Swap for a long-lived user token so the Page tokens we derive don't expire.
  const long = await graph<{ access_token: string }>("/oauth/access_token", "GET", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: secret,
    fb_exchange_token: short.access_token,
  });
  return long.access_token;
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: { id: string; username?: string; profile_picture_url?: string };
}

/** Pages the person manages, each with its Page token and linked IG account. */
export async function listPages(userToken: string): Promise<MetaPage[]> {
  const pages: MetaPage[] = [];
  let after: string | undefined;
  for (let i = 0; i < 10; i++) {
    const res = await graph<{ data: MetaPage[]; paging?: { cursors?: { after?: string }; next?: string } }>(
      "/me/accounts",
      "GET",
      {
        access_token: userToken,
        fields: "id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}",
        limit: 100,
        after,
      }
    );
    pages.push(...res.data);
    if (!res.paging?.next) break;
    after = res.paging.cursors?.after;
  }
  return pages;
}

// ── Publishing ──────────────────────────────────────────

export const VIDEO_RE = /\.(mp4|mov|m4v|webm)(\?|$)/i;

export async function publishToFacebookPage(opts: {
  pageId: string;
  token: string;
  message: string;
  mediaUrls: string[];
}): Promise<{ id: string; url: string }> {
  const { pageId, token, message, mediaUrls } = opts;
  const videos = mediaUrls.filter((u) => VIDEO_RE.test(u));
  const photos = mediaUrls.filter((u) => !VIDEO_RE.test(u));
  let id: string;

  if (videos.length) {
    const r = await graph<{ id: string }>(`/${pageId}/videos`, "POST", {
      access_token: token,
      file_url: videos[0],
      description: message,
    });
    id = r.id;
  } else if (photos.length === 1) {
    const r = await graph<{ id: string; post_id?: string }>(`/${pageId}/photos`, "POST", {
      access_token: token,
      url: photos[0],
      message,
    });
    id = r.post_id ?? r.id;
  } else if (photos.length > 1) {
    const ids: string[] = [];
    for (const url of photos.slice(0, 10)) {
      const r = await graph<{ id: string }>(`/${pageId}/photos`, "POST", {
        access_token: token,
        url,
        published: false,
      });
      ids.push(r.id);
    }
    const params: Params = { access_token: token, message };
    ids.forEach((fbid, i) => (params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: fbid })));
    const r = await graph<{ id: string }>(`/${pageId}/feed`, "POST", params);
    id = r.id;
  } else {
    const r = await graph<{ id: string }>(`/${pageId}/feed`, "POST", { access_token: token, message });
    id = r.id;
  }
  return { id, url: `https://www.facebook.com/${id}` };
}

/**
 * Step 1 for Instagram: create the media container(s). Returns the id of the
 * container to publish (the carousel parent for multi-media posts).
 */
export async function createInstagramContainer(opts: {
  igId: string;
  token: string;
  caption: string;
  mediaUrls: string[];
}): Promise<string> {
  const { igId, token, caption, mediaUrls } = opts;
  if (!mediaUrls.length) throw new MetaError("Instagram needs at least one photo or video.");

  if (mediaUrls.length === 1) {
    const url = mediaUrls[0];
    const isVideo = VIDEO_RE.test(url);
    const r = await graph<{ id: string }>(`/${igId}/media`, "POST", {
      access_token: token,
      caption,
      ...(isVideo ? { media_type: "REELS", video_url: url, share_to_feed: true } : { image_url: url }),
    });
    return r.id;
  }

  const children: string[] = [];
  for (const url of mediaUrls.slice(0, 10)) {
    const isVideo = VIDEO_RE.test(url);
    const r = await graph<{ id: string }>(`/${igId}/media`, "POST", {
      access_token: token,
      is_carousel_item: true,
      ...(isVideo ? { media_type: "VIDEO", video_url: url } : { image_url: url }),
    });
    children.push(r.id);
  }
  const parent = await graph<{ id: string }>(`/${igId}/media`, "POST", {
    access_token: token,
    media_type: "CAROUSEL",
    children: children.join(","),
    caption,
  });
  return parent.id;
}

/** IN_PROGRESS | FINISHED | PUBLISHED | ERROR | EXPIRED */
export async function instagramContainerStatus(containerId: string, token: string): Promise<{ code: string; detail?: string }> {
  const r = await graph<{ status_code?: string; status?: string }>(`/${containerId}`, "GET", {
    access_token: token,
    fields: "status_code,status",
  });
  return { code: r.status_code ?? "IN_PROGRESS", detail: r.status };
}

export async function publishInstagramContainer(igId: string, token: string, containerId: string): Promise<{ id: string; url?: string }> {
  const r = await graph<{ id: string }>(`/${igId}/media_publish`, "POST", { access_token: token, creation_id: containerId });
  try {
    const m = await graph<{ permalink?: string }>(`/${r.id}`, "GET", { access_token: token, fields: "permalink" });
    return { id: r.id, url: m.permalink };
  } catch {
    return { id: r.id };
  }
}
