import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleAuthUrl } from "@/lib/social/google";
import { appUrl, createState } from "@/lib/social/oauth-state";

/** GET /api/connect/google — send the customer to Google to grant Business Profile access. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/login?next=/accounts`);

  try {
    const state = await createState("google");
    return NextResponse.redirect(googleAuthUrl(`${appUrl()}/api/connect/google/callback`, state));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Google connection is not configured";
    return NextResponse.redirect(`${appUrl()}/accounts?error=${encodeURIComponent(msg)}`);
  }
}
