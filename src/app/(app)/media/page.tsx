import { createClient } from "@/lib/supabase/server";
import { MediaLibrary } from "@/components/MediaLibrary";

export const metadata = { title: "Media library — Social Posting Inc." };

export default async function MediaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: files } = await supabase.storage.from("media").list(user!.id, {
    limit: 200,
    sortBy: { column: "created_at", order: "desc" },
  });

  const items =
    files?.map((f) => ({
      name: f.name,
      url: supabase.storage.from("media").getPublicUrl(`${user!.id}/${f.name}`).data.publicUrl,
      size: (f.metadata as { size?: number } | null)?.size ?? 0,
    })) ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Media library</h1>
      <p className="mt-1 text-sm text-muted">
        Upload once, reuse in any post. Images and video up to 100 MB.
      </p>
      <div className="mt-6">
        <MediaLibrary userId={user!.id} files={items} />
      </div>
    </div>
  );
}
