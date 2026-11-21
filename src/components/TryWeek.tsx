"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { ShareToWhatsApp } from "@/components/ShareToWhatsApp";
import { cn } from "@/lib/utils";

const NICHES = [
  { key: "restaurant", label: "Restaurant" },
  { key: "salon", label: "Salon or spa" },
  { key: "fitness", label: "Fitness studio" },
  { key: "retail", label: "Retail shop" },
  { key: "auto", label: "Auto shop" },
  { key: "realestate", label: "Real estate" },
  { key: "medical", label: "Medical or dental" },
];

const TINTS = ["#FCE3CC", "#DCE5FB", "#E5F4EC"];

interface WeekPost {
  day: string;
  time: string;
  kind: string;
  caption: string;
  imageIdea: string;
}

export const TRY_STORAGE_KEY = "spi_try_week";

export function TryWeek() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("restaurant");
  const [town, setTown] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<WeekPost[] | null>(null);

  async function generate() {
    setError(null);
    if (!name.trim()) return setError("Enter your business name.");
    setBusy(true);
    try {
      const res = await fetch("/api/try/week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, niche, town }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setPosts(data.posts);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function edit(i: number, caption: string) {
    setPosts((p) => (p ? p.map((x, j) => (j === i ? { ...x, caption } : x)) : p));
  }

  function keepThem() {
    try {
      localStorage.setItem(TRY_STORAGE_KEY, JSON.stringify({ posts, savedAt: Date.now() }));
    } catch {
      // Storage blocked (private mode): they can still sign up, just without the import.
    }
    router.push("/signup");
  }

  if (posts) {
    return (
      <div>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success">
              7 posts ready
            </span>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">Here&apos;s your week, {name}.</h1>
            <p className="mt-2 text-muted">Click any caption to change it. Then keep them and we&apos;ll schedule them for you.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setPosts(null)}>Start over</Button>
            <Button onClick={keepThem}>Keep these 7 posts: start free</Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <Card key={i} className="flex flex-col overflow-hidden">
              <div className="flex h-28 items-end p-3" style={{ backgroundColor: TINTS[i % TINTS.length] }}>
                <span className="rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-ink">Photo idea: {p.imageIdea}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{p.day} · {p.time}</span>
                  <span className="text-xs text-muted">{p.kind}</span>
                </div>
                <label className="sr-only" htmlFor={`cap-${i}`}>Caption for {p.day}</label>
                <textarea
                  id={`cap-${i}`}
                  value={p.caption}
                  onChange={(e) => edit(i, e.target.value)}
                  rows={5}
                  className="w-full flex-1 resize-y rounded-lg border border-transparent bg-transparent p-1 text-sm leading-relaxed hover:border-line focus:border-brand focus:outline-none"
                />
                <ShareToWhatsApp text={p.caption} />
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-8 flex flex-col gap-4 bg-ink p-6 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Want these posted for you automatically?</h2>
            <p className="mt-1 text-sm text-white/70">
              14-day free trial, no credit card. Connect Facebook, Instagram and Google, and we post on schedule.
            </p>
          </div>
          <Button onClick={keepThem} className="bg-white text-ink hover:bg-white/90">Keep these 7 posts</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold md:text-4xl">Let&apos;s write your first week of posts.</h1>
      <p className="mt-2 text-muted">Three quick answers. No credit card and nothing to connect yet.</p>

      <Card className="mt-8 space-y-6 p-6">
        <div>
          <Label htmlFor="biz">Business name</Label>
          <Input id="biz" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maple & Main Bistro" maxLength={80} />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">What kind of business is it?</legend>
          <div className="flex flex-wrap gap-2">
            {NICHES.map((n) => (
              <button
                key={n.key}
                type="button"
                aria-pressed={niche === n.key}
                onClick={() => setNiche(n.key)}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                  niche === n.key ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:border-faint"
                )}
              >
                {n.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <Label htmlFor="town">Town</Label>
          <Input id="town" value={town} onChange={(e) => setTown(e.target.value)} placeholder="e.g. Wheaton" maxLength={60} />
        </div>

        {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

        <Button size="lg" className="w-full" onClick={generate} disabled={busy}>
          {busy ? "Writing your posts…" : "Show my week of posts"}
        </Button>
      </Card>
    </div>
  );
}
