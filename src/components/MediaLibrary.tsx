"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";

interface MediaFile {
  name: string;
  url: string;
  size: number;
}

const ACCEPT = "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm";
const MAX_MB = 100;

export function MediaLibrary({ userId, files }: { userId: string; files: MediaFile[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    for (const file of Array.from(list)) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`${file.name} is over ${MAX_MB} MB. Upload a smaller file.`);
        continue;
      }
      const safeName = `${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await supabase.storage.from("media").upload(`${userId}/${safeName}`, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) setError(error.message);
    }
    setBusy(false);
    router.refresh();
  }

  async function remove(name: string) {
    if (!confirm("Delete this file from your library?")) return;
    const supabase = createClient();
    const { error } = await supabase.storage.from("media").remove([`${userId}/${name}`]);
    if (error) setError(error.message);
    router.refresh();
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        onChange={(e) => upload(e.target.files)}
        aria-label="Upload media files"
      />
      <Button onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? "Uploading…" : "Upload images or video"}
      </Button>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {files.length === 0 ? (
        <Card className="mt-5 p-10 text-center">
          <p className="text-sm text-muted">
            No media yet. Upload the photos and videos you want to attach to posts.
          </p>
        </Card>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {files.map((f) => {
            const isVideo = /\.(mp4|mov|webm)$/i.test(f.name);
            return (
              <Card key={f.name} className="overflow-hidden">
                <div className="relative aspect-square bg-canvas">
                  {isVideo ? (
                    <video src={f.url} className="h-full w-full object-cover" muted />
                  ) : (
                    <Image src={f.url} alt={f.name} fill className="object-cover" sizes="200px" />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 p-2">
                  <p className="truncate text-xs text-muted" title={f.name}>{f.name}</p>
                  <button
                    onClick={() => remove(f.name)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-xs text-danger hover:bg-danger-soft"
                  >
                    Delete
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
