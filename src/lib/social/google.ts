/**
 * Google Business Profile posting. Server-only.
 *
 * - OAuth scope: https://www.googleapis.com/auth/business.manage
 * - Accounts:  GET mybusinessaccountmanagement.googleapis.com/v1/accounts
 * - Locations: GET mybusinessbusinessinformation.googleapis.com/v1/{account}/locations?readMask=name,title
 * - Post:      POST mybusiness.googleapis.com/v4/{account}/{location}/localPosts
 *              { languageCode, summary, topicType: "STANDARD", media: [{ mediaFormat: "PHOTO", sourceUrl }] }
 *
 * Google only grants these APIs to projects that apply for Business Profile
 * API access; until then calls fail with a quota/permission error.
 */

const SCOPE = "https://www.googleapis.com/auth/business.manage";

export class GoogleError extends Error {
  constructor(message: string, public tokenInvalid = false) {
    super(message);
  }
}

function creds() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set");
  return { id, secret };
}

export function googleAuthUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: creds().id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams(params),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || data.error) {
    throw new GoogleError(data.error_description || data.error || `Google token error (${res.status})`, data.error === "invalid_grant");
  }
  return data;
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const { id, secret } = creds();
  return tokenRequest({ code, client_id: id, client_secret: secret, redirect_uri: redirectUri, grant_type: "authorization_code" });
}

export async function refreshGoogleToken(refreshToken: string) {
  const { id, secret } = creds();
  return tokenRequest({ refresh_token: refreshToken, client_id: id, client_secret: secret, grant_type: "refresh_token" });
}

async function gfetch<T>(url: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers as Record<string, string>) },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; status?: string } };
  if (!res.ok || data.error) {
    throw new GoogleError(data.error?.message || `Google API error (${res.status})`, res.status === 401);
  }
  return data;
}

export interface GbpLocation {
  /** "accounts/{a}/locations/{l}" — the parent path used for posting */
  path: string;
  title: string;
}

export async function listLocations(token: string): Promise<GbpLocation[]> {
  const out: GbpLocation[] = [];
  const accounts = await gfetch<{ accounts?: { name: string }[] }>(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    token
  );
  for (const acct of accounts.accounts ?? []) {
    let pageToken: string | undefined;
    for (let i = 0; i < 10; i++) {
      const q = new URLSearchParams({ readMask: "name,title", pageSize: "100" });
      if (pageToken) q.set("pageToken", pageToken);
      const res = await gfetch<{ locations?: { name: string; title?: string }[]; nextPageToken?: string }>(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${acct.name}/locations?${q}`,
        token
      );
      for (const loc of res.locations ?? []) {
        // loc.name is "locations/{l}"; posting needs "accounts/{a}/locations/{l}"
        out.push({ path: `${acct.name}/${loc.name}`, title: loc.title ?? loc.name });
      }
      if (!res.nextPageToken) break;
      pageToken = res.nextPageToken;
    }
  }
  return out;
}

export async function publishGoogleLocalPost(opts: {
  locationPath: string;
  token: string;
  summary: string;
  imageUrl?: string;
}): Promise<{ id: string; url?: string }> {
  const body: Record<string, unknown> = {
    languageCode: "en-US",
    topicType: "STANDARD",
    summary: opts.summary.slice(0, 1500),
  };
  if (opts.imageUrl) body.media = [{ mediaFormat: "PHOTO", sourceUrl: opts.imageUrl }];
  const r = await gfetch<{ name: string; searchUrl?: string }>(
    `https://mybusiness.googleapis.com/v4/${opts.locationPath}/localPosts`,
    opts.token,
    { method: "POST", body: JSON.stringify(body) }
  );
  return { id: r.name, url: r.searchUrl };
}
