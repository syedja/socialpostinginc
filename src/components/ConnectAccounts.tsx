"use client";

import { useEffect, useState } from "react";
import { PLATFORMS } from "@/lib/limits";
import { Button, Card } from "@/components/ui";

export function ConnectAccounts() {
  const [linked, setLinked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/social/connect")
      .then((r) => r.json())
      .then((d) => setLinked(d.linked ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function openLinkPage() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/social/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not open the linking page");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the linking page");
      setBusy(false);
    }
  }

  return (
    <div>
      <Button onClick={openLinkPage} disabled={busy}>
        {busy ? "Opening…" : linked.length ? "Manage connected accounts" : "Connect your accounts"}
      </Button>
      <p className="mt-2 text-xs text-faint">
        You'll be taken to a secure page to sign in to each network. We never see your passwords.
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {PLATFORMS.map((p) => {
          const isLinked = linked.includes(p.slug);
          return (
            <Card key={p.slug} className="flex items-center justify-between p-4">
              <span className="flex items-center gap-3 text-sm font-medium">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.accent }} aria-hidden />
                {p.label}
              </span>
              {loading ? (
                <span className="text-xs text-faint">Checking…</span>
              ) : isLinked ? (
                <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                  Connected
                </span>
              ) : (
                <span className="rounded-full bg-canvas px-2.5 py-0.5 text-xs text-muted">Not connected</span>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
