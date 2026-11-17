"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const KEY = "spi_try_week";

/**
 * After signup, moves the posts a visitor made on /try (kept in their
 * browser) into their account as drafts, then shows a one-time note.
 */
export function ImportTryWeek() {
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch {
      return;
    }
    if (!raw) return;
    let posts: unknown = [];
    try {
      posts = JSON.parse(raw).posts;
    } catch {
      localStorage.removeItem(KEY);
      return;
    }
    fetch("/api/posts/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posts }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        localStorage.removeItem(KEY);
        if (d?.imported) {
          setCount(d.imported);
          router.refresh();
        }
      })
      .catch(() => {});
  }, [router]);

  if (!count) return null;
  return (
    <p role="status" className="mb-5 rounded-lg bg-success-soft px-4 py-3 text-sm text-success">
      Your {count} posts are saved in <Link className="font-medium underline" href="/dashboard?tab=draft">Drafts</Link>.
      Next: <Link className="font-medium underline" href="/accounts">connect your accounts</Link>, add a photo to each, and schedule them.
    </p>
  );
}
