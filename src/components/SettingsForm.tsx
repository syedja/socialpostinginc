"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, Label } from "@/components/ui";
import { COMMON_TIMEZONES } from "@/lib/utils";

export function SettingsForm({
  userId,
  initialName,
  initialTimezone,
  email,
}: {
  userId: string;
  initialName: string;
  initialTimezone: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Offer the browser-detected zone plus common ones, deduplicated.
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = Array.from(new Set([detected, initialTimezone, ...COMMON_TIMEZONES]));

  async function save() {
    setBusy(true);
    setSaved(false);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name, timezone, updated_at: new Date().toISOString() })
      .eq("id", userId);
    setBusy(false);
    if (error) return setError(error.message);
    setSaved(true);
    router.refresh();
  }

  return (
    <Card className="max-w-lg p-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled className="bg-canvas text-muted" />
          <p className="mt-1 text-xs text-faint">Your login email can't be changed here.</p>
        </div>
        <div>
          <Label htmlFor="name">Business or full name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="tz">Timezone</Label>
          <select
            id="tz"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            {zones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-faint">Scheduled times use this timezone.</p>
        </div>

        {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        {saved && <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">Settings saved.</p>}

        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
      </div>
    </Card>
  );
}
