import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/access";
import { Composer, type ExistingPost } from "@/components/Composer";

export const metadata = { title: "New post — Social Posting Inc." };

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; client?: string }>;
}) {
  const { id, client } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin composing on behalf of a Managed-plan client
  const actingForClient = !!client && client !== user!.id;
  if (actingForClient && !isAdminEmail(user!.email)) redirect("/dashboard");
  const targetUserId = actingForClient ? client! : user!.id;
  const db = actingForClient ? createServiceClient() : supabase;

  const { data: profile } = await db
    .from("profiles")
    .select("timezone, full_name, email")
    .eq("id", targetUserId)
    .single();

  // Media library from Storage (target user's folder)
  const { data: files } = await db.storage.from("media").list(targetUserId, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  const media =
    files?.map((f) => ({
      name: f.name,
      url: db.storage.from("media").getPublicUrl(`${targetUserId}/${f.name}`).data.publicUrl,
    })) ?? [];

  let existing: ExistingPost | undefined;
  if (id) {
    const { data } = await db
      .from("posts")
      .select("id, content, platforms, media_urls, scheduled_at, status")
      .eq("id", id)
      .eq("user_id", targetUserId)
      .single();
    if (data) existing = data as ExistingPost;
  }

  return (
    <div>
      {actingForClient && (
        <p className="mb-4 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">
          Composing on behalf of <strong>{profile?.full_name || profile?.email}</strong> (Managed plan)
        </p>
      )}
      <h1 className="text-2xl font-semibold">{existing ? "Edit post" : "New post"}</h1>
      <p className="mt-1 text-sm text-muted">
        Write once, pick your platforms, and publish now or schedule for later.
      </p>
      <div className="mt-6">
        <Composer
          timezone={profile?.timezone ?? "America/Chicago"}
          media={media}
          existing={existing}
          clientId={actingForClient ? targetUserId : undefined}
        />
      </div>
    </div>
  );
}
