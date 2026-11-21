import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { exchangeCode, listPages } from "@/lib/social/meta";
import { saveAccount } from "@/lib/social/accounts";
import { appUrl, verifyState } from "@/lib/social/oauth-state";

/**
 * GET /api/connect/meta/callback — Facebook sends the customer back here.
 * Saves every Page they granted, plus the Instagram professional account
 * linked to each Page. Page tokens derived from a long-lived user token
 * don't expire, so no refresh job is needed.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (q: string) => NextResponse.redirect(`${appUrl()}/accounts?${q}`);

  if (url.searchParams.get("error")) {
    return back(`error=${encodeURIComponent(url.searchParams.get("error_description") ?? "Facebook connection was cancelled.")}`);
  }
  if (!(await verifyState("meta", url.searchParams.get("state")))) {
    return back(`error=${encodeURIComponent("That sign-in link expired. Please try connecting again.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/login?next=/accounts`);

  try {
    const userToken = await exchangeCode(url.searchParams.get("code") ?? "", `${appUrl()}/api/connect/meta/callback`);
    const pages = await listPages(userToken);
    if (!pages.length) {
      return back(
        `error=${encodeURIComponent("No Facebook Pages were shared. Reconnect and tick the Page(s) you want to post to.")}`
      );
    }

    const admin = createServiceClient();
    let fb = 0;
    let ig = 0;
    for (const page of pages) {
      await saveAccount(admin, {
        userId: user.id,
        platform: "facebook",
        externalId: page.id,
        name: page.name,
        pictureUrl: page.picture?.data?.url ?? null,
        accessToken: page.access_token,
      });
      fb++;
      const igAcct = page.instagram_business_account;
      if (igAcct?.id) {
        await saveAccount(admin, {
          userId: user.id,
          platform: "instagram",
          externalId: igAcct.id,
          name: igAcct.username ? `@${igAcct.username}` : `${page.name} (Instagram)`,
          pictureUrl: igAcct.profile_picture_url ?? null,
          meta: { page_id: page.id },
          // Instagram publishing through Facebook Login uses the linked Page's token.
          accessToken: page.access_token,
        });
        ig++;
      }
    }
    return back(`connected=${encodeURIComponent(`${fb} Facebook Page${fb === 1 ? "" : "s"}, ${ig} Instagram account${ig === 1 ? "" : "s"}`)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not connect Facebook";
    return back(`error=${encodeURIComponent(msg)}`);
  }
}
