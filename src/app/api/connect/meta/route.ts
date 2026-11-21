import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { metaAuthUrl } from "@/lib/social/meta";
import { appUrl, createState } from "@/lib/social/oauth-state";

/** GET /api/connect/meta — send the customer to Facebook to grant Page + Instagram access. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/login?next=/accounts`);

  try {
    const state = await createState("meta");
    return NextResponse.redirect(metaAuthUrl(`${appUrl()}/api/connect/meta/callback`, state));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Facebook connection is not configured";
    return NextResponse.redirect(`${appUrl()}/accounts?error=${encodeURIComponent(msg)}`);
  }
}
