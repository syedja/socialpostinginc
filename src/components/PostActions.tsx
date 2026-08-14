"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui";

export function PostActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function remove() {
    const verb = status === "scheduled" ? "Cancel this scheduled post?" : "Delete this post?";
    if (!confirm(verb)) return;
    setBusy("del");
    const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) router.refresh();
    else alert((await res.json()).error ?? "Could not delete the post.");
  }

  async function checkStatus() {
    setBusy("check");
    const res = await fetch(`/api/posts/${id}/refresh`, { method: "POST" });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      alert(data.error ?? "Could not check status.");
      return;
    }
    if (data.message) alert(data.message);
    router.refresh();
  }

  return (
    <div className="flex shrink-0 gap-2">
      {(status === "scheduled" || status === "published" || status === "failed") && (
        <Button variant="secondary" size="sm" onClick={checkStatus} disabled={!!busy}>
          {busy === "check" ? "…" : "Check status"}
        </Button>
      )}
      {status !== "published" && (
        <ButtonLink href={`/compose?id=${id}`} variant="secondary" size="sm">
          Edit
        </ButtonLink>
      )}
      <Button variant="danger" size="sm" onClick={remove} disabled={!!busy}>
        {busy === "del" ? "…" : status === "scheduled" ? "Cancel" : "Delete"}
      </Button>
    </div>
  );
}
