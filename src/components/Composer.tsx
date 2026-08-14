"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PLATFORMS, effectiveLimit, mediaRequiredPlatforms } from "@/lib/limits";
import { localToUtcIso, cn } from "@/lib/utils";
import { Button, Card, Label } from "@/components/ui";

const EMOJIS = ["😀","😂","😍","🥳","🔥","✨","💪","👏","🙌","❤️","💯","🎉","☕","🍕","🍔","🥗","🛍️","💈","🏋️","🏡","🚗","🦷","📅","📣","👇","➡️","✅","⭐","🌟","🎁"];

export interface ComposerMedia {
  name: string;
  url: string;
}

export interface ExistingPost {
  id: string;
  content: string;
  platforms: string[];
  media_urls: string[];
  scheduled_at: string | null;
  status: string;
}

/** Ring showing how much of a platform's limit the current draft uses. */
function LimitRing({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(used / limit, 1);
  const over = used > limit;
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="shrink-0">
      <circle cx="9" cy="9" r={r} fill="none" stroke="var(--color-line)" strokeWidth="2.5" />
      <circle
        cx="9" cy="9" r={r} fill="none"
        stroke={over ? "var(--color-danger)" : pct > 0.85 ? "var(--color-warn)" : "var(--color-brand)"}
        strokeWidth="2.5"
        strokeDasharray={`${c * pct} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 9 9)"
      />
    </svg>
  );
}

export function Composer({
  timezone,
  media,
  existing,
  clientId,
}: {
  timezone: string;
  media: ComposerMedia[];
  existing?: ExistingPost;
  /** Admin-only: compose on behalf of this Managed-plan client. */
  clientId?: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState(existing?.content ?? "");
  const [selected, setSelected] = useState<string[]>(existing?.platforms ?? []);
  const [mediaUrls, setMediaUrls] = useState<string[]>(existing?.media_urls ?? []);
  const [when, setWhen] = useState<string>(() => {
    if (!existing?.scheduled_at) return "";
    // Show the stored UTC time as local wall-clock in the user's timezone.
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date(existing.scheduled_at));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  });
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const used = content.length;
  const tightest = effectiveLimit(selected);
  const overLimit = tightest !== null && used > tightest;

  const toggle = (slug: string) =>
    setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));

  const scheduledIso = useMemo(() => {
    if (!when) return null;
    try {
      return localToUtcIso(when, timezone);
    } catch {
      return null;
    }
  }, [when, timezone]);

  async function submit(action: "draft" | "schedule" | "publish") {
    setError(null);
    if (action === "schedule" && !scheduledIso) {
      setError("Pick a date and time to schedule.");
      return;
    }
    if (action !== "draft" && overLimit) {
      setError("Your post is over the limit for a selected platform. Shorten it or deselect that platform.");
      return;
    }
    const needMedia = mediaRequiredPlatforms(selected);
    if (action !== "draft" && needMedia.length && mediaUrls.length === 0) {
      setError(
        `${needMedia.map((p) => p.label).join(", ")} require${needMedia.length === 1 ? "s" : ""} an image or video. Attach media or deselect ${needMedia.length === 1 ? "it" : "them"}.`
      );
      return;
    }
    setBusy(action);
    try {
      const payload = {
        content,
        platforms: selected,
        mediaUrls,
        scheduledAt: action === "schedule" ? scheduledIso : null,
        action,
        clientId,
      };
      const res = existing
        ? await fetch(`/api/posts/${existing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, scheduledAt: scheduledIso, clientId }),
          })
        : await fetch("/api/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      if (data.warning) {
        // Partial success (e.g. posted to 2 of 3 platforms) — let them see why
        // before leaving, since the dashboard's "Failed" text won't show here.
        alert(data.warning);
      }
      router.push(clientId ? "/admin" : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Platform chips — the signature: each chip carries its own limit ring */}
      <Card className="p-4">
        <Label>Platforms</Label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const active = selected.includes(p.slug);
            return (
              <button
                key={p.slug}
                type="button"
                onClick={() => toggle(p.slug)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line bg-surface text-muted hover:border-faint"
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.accent }} aria-hidden />
                {p.label}
                {active && <LimitRing used={used} limit={p.limit} />}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Content */}
      <Card className="p-4">
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor="content">Your post</Label>
          <span
            className={cn("text-xs tabular-nums", overLimit ? "font-medium text-danger" : "text-faint")}
            aria-live="polite"
          >
            {used}
            {tightest !== null && ` / ${tightest.toLocaleString()}`}
          </span>
        </div>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={7}
          placeholder="What do you want to share? Tip: lead with the offer or the news."
          className="w-full resize-y rounded-lg border border-line bg-surface p-3 text-sm leading-relaxed placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" type="button" onClick={() => setShowEmoji(!showEmoji)} aria-expanded={showEmoji}>
            😊 Emoji
          </Button>
          <Button variant="secondary" size="sm" type="button" onClick={() => setShowMedia(!showMedia)} aria-expanded={showMedia}>
            ▣ Add media ({mediaUrls.length})
          </Button>
        </div>
        {showEmoji && (
          <div className="mt-3 flex flex-wrap gap-1 rounded-lg border border-line bg-canvas p-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setContent((c) => c + e)}
                className="rounded p-1 text-lg hover:bg-surface"
                aria-label={`Insert ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        )}
        {showMedia && (
          <div className="mt-3 rounded-lg border border-line bg-canvas p-3">
            {media.length === 0 ? (
              <p className="text-sm text-muted">
                Your media library is empty. Upload images or video on the Media library page first.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {media.map((m) => {
                  const on = mediaUrls.includes(m.url);
                  const isVideo = /\.(mp4|mov|webm)$/i.test(m.name);
                  return (
                    <button
                      key={m.url}
                      type="button"
                      onClick={() =>
                        setMediaUrls((urls) => (on ? urls.filter((u) => u !== m.url) : [...urls, m.url]))
                      }
                      aria-pressed={on}
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-lg border-2",
                        on ? "border-brand" : "border-transparent"
                      )}
                    >
                      {isVideo ? (
                        <span className="flex h-full w-full items-center justify-center bg-ink text-xs text-white">
                          ▶ video
                        </span>
                      ) : (
                        <Image src={m.url} alt={m.name} fill className="object-cover" sizes="120px" />
                      )}
                      {on && (
                        <span className="absolute right-1 top-1 rounded-full bg-brand px-1.5 text-xs text-white">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Schedule */}
      <Card className="p-4">
        <Label htmlFor="when">Schedule for (optional)</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="when"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="h-10 rounded-lg border border-line bg-surface px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <span className="text-xs text-faint">Times are in your timezone: {timezone}</span>
        </div>
      </Card>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => submit(when ? "schedule" : "publish")} disabled={!!busy}>
          {busy === "schedule" || busy === "publish"
            ? "Working…"
            : when
              ? "Schedule post"
              : "Publish now"}
        </Button>
        <Button variant="secondary" onClick={() => submit("draft")} disabled={!!busy}>
          {busy === "draft" ? "Saving…" : "Save as draft"}
        </Button>
      </div>
    </div>
  );
}
