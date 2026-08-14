import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS — server-only.
 * Used by the Stripe webhook and admin on-behalf actions for Managed clients.
 */
export function createServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
