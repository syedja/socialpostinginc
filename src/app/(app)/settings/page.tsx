import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/SettingsForm";

export const metadata = { title: "Settings — Social Posting Inc." };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, timezone")
    .eq("id", user!.id)
    .single();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-muted">Your profile and posting preferences.</p>
      <div className="mt-6">
        <SettingsForm
          userId={user!.id}
          email={user!.email ?? ""}
          initialName={profile?.full_name ?? ""}
          initialTimezone={profile?.timezone ?? "America/Chicago"}
        />
      </div>
    </div>
  );
}
