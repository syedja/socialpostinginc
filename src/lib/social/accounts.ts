import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt, encrypt } from "@/lib/crypto";

export type SocialPlatform = "facebook" | "instagram" | "google_business";

export interface SocialAccount {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  external_id: string;
  name: string;
  picture_url: string | null;
  enabled: boolean;
  status: string;
  meta: Record<string, unknown>;
}

/** Insert or update a connected account and its (encrypted) tokens. Service client only. */
export async function saveAccount(
  admin: SupabaseClient,
  input: {
    userId: string;
    platform: SocialPlatform;
    externalId: string;
    name: string;
    pictureUrl?: string | null;
    meta?: Record<string, unknown>;
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: string | null;
  }
): Promise<string> {
  const { data, error } = await admin
    .from("social_accounts")
    .upsert(
      {
        user_id: input.userId,
        platform: input.platform,
        external_id: input.externalId,
        name: input.name,
        picture_url: input.pictureUrl ?? null,
        meta: input.meta ?? {},
        status: "connected",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform,external_id" }
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save account");

  // Keep an existing refresh token if Google didn't send a new one.
  const tokenRow: Record<string, unknown> = {
    account_id: data.id,
    access_token: encrypt(input.accessToken),
    expires_at: input.expiresAt ?? null,
    updated_at: new Date().toISOString(),
  };
  if (input.refreshToken) tokenRow.refresh_token = encrypt(input.refreshToken);
  const { error: tErr } = await admin.from("social_tokens").upsert(tokenRow, { onConflict: "account_id" });
  if (tErr) throw new Error(tErr.message);
  return data.id;
}

export interface AccountWithTokens extends SocialAccount {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
}

/** Enabled accounts of the given platforms for a user, with decrypted tokens. Service client only. */
export async function loadPublishTargets(
  admin: SupabaseClient,
  userId: string,
  platforms: string[]
): Promise<AccountWithTokens[]> {
  const { data: accounts } = await admin
    .from("social_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("enabled", true)
    .in("platform", platforms.length ? platforms : ["__none__"]);
  if (!accounts?.length) return [];

  const { data: tokens } = await admin
    .from("social_tokens")
    .select("account_id, access_token, refresh_token, expires_at")
    .in(
      "account_id",
      accounts.map((a) => a.id)
    );
  const byId = new Map((tokens ?? []).map((t) => [t.account_id, t]));

  const out: AccountWithTokens[] = [];
  for (const a of accounts as SocialAccount[]) {
    const t = byId.get(a.id);
    if (!t) continue;
    try {
      out.push({
        ...a,
        accessToken: decrypt(t.access_token),
        refreshToken: t.refresh_token ? decrypt(t.refresh_token) : null,
        expiresAt: t.expires_at,
      });
    } catch {
      // Unreadable token (e.g. encryption key changed) → needs reconnecting.
      await markNeedsReconnect(admin, a.id);
    }
  }
  return out;
}

export async function updateAccessToken(admin: SupabaseClient, accountId: string, token: string, expiresAt: string) {
  await admin
    .from("social_tokens")
    .update({ access_token: encrypt(token), expires_at: expiresAt, updated_at: new Date().toISOString() })
    .eq("account_id", accountId);
}

export async function markNeedsReconnect(admin: SupabaseClient, accountId: string) {
  await admin
    .from("social_accounts")
    .update({ status: "needs_reconnect", updated_at: new Date().toISOString() })
    .eq("id", accountId);
}
