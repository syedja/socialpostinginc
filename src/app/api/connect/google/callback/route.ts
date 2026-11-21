import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { exchangeGoogleCode, listLocations } from "@/lib/social/google";
import { saveAccount } from "@/lib/social/accounts";
import { appUrl, verifyState } from "@/lib/social/oauth-state";

/** GET /api/connect/google/callback — saves each Business Profile location the customer manages. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (q: string) => NextResponse.redirect(`${appUrl()}/accounts?${q}`);

  if (url.searchParams.get("error")) {
    return back(`error=${encodeURIComponent("Google connection was cancelled.")}`);
  }
  if (!(await verifyState("google", url.searchParams.get("state")))) {
    return back(`error=${encodeURIComponent("That sign-in link expired. Please try connecting again.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/login?next=/accounts`);

  try {
    const tokens = await exchangeGoogleCode(url.searchParams.get("code") ?? "", `${appUrl()}/api/connect/google/callback`);
    const locations = await listLocations(tokens.access_token);
    if (!locations.length) {
      return back(`error=${encodeURIComponent("No Google Business Profile locations were found on that Google account.")}`);
    }
    const admin = createServiceClient();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    for (const loc of locations) {
      await saveAccount(admin, {
        userId: user.id,
        platform: "google_business",
        externalId: loc.path,
        name: loc.title,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
      });
    }
    return back(`connected=${encodeURIComponent(`${locations.length} Google Business location${locations.length === 1 ? "" : "s"}`)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not connect Google";
    return back(`error=${encodeURIComponent(msg)}`);
  }
}
