import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile, generateLinkUrl, getLinkedAccounts } from "@/lib/social-provider";

/**
 * POST /api/social/connect
 * Ensures the customer has an Upload-Post profile (username = their user id),
 * then returns the hosted linking URL where they connect their accounts.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    await ensureProfile(user.id);
    const url = await generateLinkUrl(user.id);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start account linking";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** GET /api/social/connect — list currently linked platforms. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const linked = await getLinkedAccounts(user.id);
  return NextResponse.json({ linked });
}
