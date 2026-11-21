"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { platformBySlug } from "@/lib/limits";
import { Button, Card } from "@/components/ui";

interface Account {
  id: string;
  platform: string;
  name: string;
  picture_url: string | null;
  enabled: boolean;
  status: string;
}

export function ConnectAccounts() {
  const params = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(params.get("error"));
  const connected = params.get("connected");

  const load = useCallback(async () => {
    const r = await fetch("/api/accounts");
    const d = await r.json().catch(() => ({}));
    setAccounts(d.accounts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(a: Account) {
    setBusy(a.id);
    const r = await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, enabled: !a.enabled }),
    });
    if (!r.ok) setError((await r.json()).error ?? "Could not update");
    await load();
    setBusy(null);
  }

  async function disconnect(a: Account) {
    if (!confirm(`Disconnect ${a.name}? Scheduled posts won't go to it anymore.`)) return;
    setBusy(a.id);
    const r = await fetch(`/api/accounts?id=${a.id}`, { method: "DELETE" });
    if (!r.ok) setError((await r.json()).error ?? "Could not disconnect");
    await load();
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      {connected && (
        <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">Connected: {connected}.</p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-semibold">Facebook &amp; Instagram</h2>
          <p className="mt-1 text-sm text-muted">
            Sign in with Facebook and choose your business Page. Instagram connects automatically if it&apos;s a
            Business or Creator account linked to that Page.
          </p>
          <a href="/api/connect/meta" className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#1877F2] px-4 text-sm font-medium text-white hover:opacity-90">
            Connect Facebook &amp; Instagram
          </a>
        </Card>
        <Card className="p-5">
          <h2 className="text-base font-semibold">Google Business Profile</h2>
          <p className="mt-1 text-sm text-muted">
            Post updates and offers to your Google listing, where local customers find you on Search and Maps.
          </p>
          <a href="/api/connect/google" className="mt-4 inline-flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-canvas">
            Connect Google
          </a>
        </Card>
      </div>

      <p className="text-xs text-faint">
        You sign in on Facebook&apos;s or Google&apos;s own page. We never see your password, and you can disconnect anytime.
      </p>

      <div>
        <h2 className="text-base font-semibold">Your accounts</h2>
        <p className="mt-1 text-sm text-muted">Posts go to every account that&apos;s switched on for the platforms you pick.</p>
        <div className="mt-3 space-y-2">
          {loading && <Card className="p-4 text-sm text-muted">Loading…</Card>}
          {!loading && !accounts.length && (
            <Card className="p-6 text-center text-sm text-muted">Nothing connected yet.</Card>
          )}
          {accounts.map((a) => {
            const p = platformBySlug(a.platform);
            return (
              <Card key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  {a.picture_url ? (
                    <Image src={a.picture_url} alt="" width={36} height={36} className="rounded-full" unoptimized />
                  ) : (
                    <span className="h-9 w-9 shrink-0 rounded-full" style={{ backgroundColor: p?.accent ?? "#999" }} aria-hidden />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted">
                      {p?.label ?? a.platform}
                      {a.status === "needs_reconnect" && <span className="ml-2 font-medium text-danger">Needs reconnecting</span>}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => toggle(a)} disabled={busy === a.id} aria-pressed={a.enabled}>
                    {a.enabled ? "On" : "Off"}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => disconnect(a)} disabled={busy === a.id}>
                    Disconnect
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
