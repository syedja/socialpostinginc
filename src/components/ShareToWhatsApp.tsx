"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/**
 * Opens WhatsApp with the caption ready to send to a Status, Channel or
 * group. On phones that support sharing files, the first photo is attached
 * too. WhatsApp has no official API for Status or Channel posts, so the
 * owner sends it themselves with one tap.
 */
export function ShareToWhatsApp({
  text,
  imageUrl,
  size = "sm",
}: {
  text: string;
  imageUrl?: string | null;
  size?: "sm" | "md";
}) {
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      if (imageUrl && typeof navigator !== "undefined" && "canShare" in navigator) {
        const blob = await fetch(imageUrl).then((r) => r.blob());
        const ext = blob.type.split("/")[1] || "jpg";
        const file = new File([blob], `post.${ext}`, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text });
          return;
        }
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      // User closed the share sheet: nothing to do. Anything else: fall back to the link.
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="secondary" size={size} onClick={share} disabled={busy || !text.trim()}>
      <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3L3 21z" />
      </svg>
      {busy ? "Opening…" : "Share to WhatsApp"}
    </Button>
  );
}
