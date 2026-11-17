"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui";
import { ShareToWhatsApp } from "@/components/ShareToWhatsApp";

export function PostActions({
  id,
  status,
  content,
  imageUrl,
  canRetry,
}: {
  id: string;
  status: string;
  content: string;
  imageUrl?: string | null;
  canRetry?: boolean;
}) {
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

  async function retry() {
    setBusy("retry");
    const res = await fetch(`/api/posts/${id}/retry`, { method: "POST" });
    const data = await res.json();
    setBusy(null);
    alert(data.message ?? data.error ?? (res.ok ? "Done." : "Could not retry."));
    router.refresh();
  }

  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {canRetry && (
        <Button size="sm" onClick={retry} disabled={!!busy}>
          {busy === "retry" ? "Retrying…" : "Retry"}
        </Button>
      )}
      {status !== "published" && status !== "publishing" && (
        <ButtonLink href={`/compose?id=${id}`} variant="secondary" size="sm">
          Edit
        </ButtonLink>
      )}
      <ShareToWhatsApp text={content} imageUrl={imageUrl} />
      {status !== "publishing" && (
        <Button variant="danger" size="sm" onClick={remove} disabled={!!busy}>
          {busy === "del" ? "…" : status === "scheduled" ? "Cancel" : "Delete"}
        </Button>
      )}
    </div>
  );
}
