import Link from "next/link";
import { ButtonLink, Card } from "@/components/ui";
import { PLANS } from "@/lib/stripe";
import { PLATFORMS } from "@/lib/limits";

export default function LandingPage() {
  return (
    <div>
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-[family-name:--font-display] text-lg font-semibold tracking-tight">
            Social Posting <span className="text-brand">Inc.</span>
          </Link>
          <nav className="flex items-center gap-2">
            <ButtonLink href="/login" variant="ghost">Log in</ButtonLink>
            <ButtonLink href="/signup">Start free trial</ButtonLink>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 md:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
            Built for local small businesses
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Post everywhere. <span className="text-brand">Write it once.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            Schedule and publish to Facebook, Instagram, LinkedIn, X, and more from one
            simple dashboard. No bloat, no learning curve — just consistent posting.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/signup" size="lg">Start your free trial</ButtonLink>
            <ButtonLink href="#pricing" variant="secondary" size="lg">See pricing</ButtonLink>
          </div>
        </div>

        {/* Platform strip */}
        <div className="mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-center gap-2">
          {PLATFORMS.map((p) => (
            <span
              key={p.slug}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.accent }} aria-hidden />
              {p.label}
            </span>
          ))}
        </div>
      </section>

      {/* Feature trio */}
      <section className="border-y border-line bg-surface py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
          {[
            {
              title: "One composer, every platform",
              body: "Write your post once. We track each network's character limit as you type, so nothing gets cut off.",
            },
            {
              title: "Schedule and forget",
              body: "Pick a date and time in your timezone. Your post goes out automatically — even while you're serving customers.",
            },
            {
              title: "A calendar you can trust",
              body: "See every scheduled, published, and draft post in one monthly view. Edit or move anything before it goes live.",
            },
          ].map((f) => (
            <Card key={f.title} className="p-6">
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold">Simple pricing</h2>
          <p className="mt-3 text-muted">
            Run it yourself for $19, or hand us the keyboard for $199. 14-day free trial, no card required.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-3xl gap-6 md:grid-cols-2">
          {(Object.entries(PLANS) as [string, (typeof PLANS)[keyof typeof PLANS]][]).map(
            ([key, plan]) => (
              <Card key={key} className={key === "managed" ? "border-brand p-6 shadow-[--shadow-lift]" : "p-6"}>
                {key === "managed" && (
                  <p className="mb-3 inline-flex rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">
                    Done for you
                  </p>
                )}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-2">
                  <span className="text-4xl font-semibold">${plan.price}</span>
                  <span className="text-muted">/month</span>
                </p>
                <ul className="mt-5 space-y-2.5 text-sm text-muted">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="mt-0.5 text-success" aria-hidden>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  href="/signup"
                  variant={key === "managed" ? "primary" : "secondary"}
                  className="mt-6 w-full"
                >
                  Start free trial
                </ButtonLink>
              </Card>
            )
          )}
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-faint">
          Managed covers 12 posts per month across up to 3 platforms. Need daily posting, more
          platforms, or extra revisions? Email us for a custom quote.
        </p>
      </section>

      <footer className="border-t border-line bg-surface py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Social Posting Inc. · Glendale Heights, IL</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-ink">Log in</Link>
            <Link href="/signup" className="hover:text-ink">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
