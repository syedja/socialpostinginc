import Link from "next/link";
import { TryWeek } from "@/components/TryWeek";

export const metadata = {
  title: "See your week of posts free — Social Posting Inc.",
  description: "Tell us about your business and see 7 ready-to-post social media posts in about a minute. No credit card.",
};

export default function TryPage() {
  return (
    <div>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-[family-name:--font-display] text-lg font-semibold">
            Social Posting <span className="text-brand">Inc.</span>
          </Link>
          <Link href="/login" className="text-sm text-muted hover:text-ink">Log in</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <TryWeek />
      </main>
    </div>
  );
}
