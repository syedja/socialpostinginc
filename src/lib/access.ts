import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Publishing requires an active subscription, or a trial that hasn't expired.
 * Drafts are always allowed so people can explore before subscribing.
 */
export async function canPublish(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: boolean; reason?: string }> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (sub?.status === "active") return { ok: true };

  if (sub?.status === "trialing") {
    const stillValid = !sub.current_period_end || new Date(sub.current_period_end) > new Date();
    if (stillValid) return { ok: true };
    return {
      ok: false,
      reason: "Your free trial has ended. Pick a plan on the Billing page to keep publishing.",
    };
  }

  return {
    ok: false,
    reason:
      "Publishing requires an active plan. Start your free 14-day trial on the Billing page.",
  };
}

/**
 * Admins (you / future team) can compose and publish on behalf of Managed-plan
 * clients. Comma-separated list in the ADMIN_EMAILS env var.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}
