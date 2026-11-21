import Link from "next/link";
import { ButtonLink, Card } from "@/components/ui";
import { PLANS } from "@/lib/plans";

const NICHES = ["Restaurants", "Salons & spas", "Fitness studios", "Retail shops", "Auto shops", "Real estate", "Medical & dental"];

const SAMPLE_DAYS = [
  { d: "Mon", c: "#DCE5FB" },
  { d: "Tue", c: "#FCE3CC" },
  { d: "Wed", c: "#DCE5FB" },
  { d: "Thu", c: "#E5F4EC" },
  { d: "Fri", c: "#FCE3CC" },
  { d: "Sat", c: "#DCE5FB" },
  { d: "Sun", c: "#E5F4EC" },
];

function Check() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-brand">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2.5 font-[family-name:--font-display] text-lg font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="17" rx="3" />
                <path d="M3 9h18M8 2v4M16 2v4M8 14h3" />
              </svg>
            </span>
            Social Posting Inc.
          </Link>
          <nav className="flex items-center gap-1 text-sm sm:gap-4">
            <a href="#how" className="hidden px-2 text-muted hover:text-ink sm:inline">How it works</a>
            <a href="#pricing" className="hidden px-2 text-muted hover:text-ink sm:inline">Pricing</a>
            <ButtonLink href="/login" variant="ghost">Log in</ButtonLink>
            <ButtonLink href="/try" className="bg-ink hover:bg-ink/90">Start free</ButtonLink>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 md:grid-cols-[1.15fr_1fr] md:pt-20">
        <div>
          <p className="inline-flex rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand-hover">
            For local businesses in DuPage County &amp; Chicagoland
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] md:text-6xl">
            See a week of your posts before you pay a cent.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted md:text-xl">
            Tell us about your business. We write 7 days of Facebook, Instagram and Google posts for your industry
            and your town. Edit them, keep them, and we post them on schedule.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/try" size="lg">Show me my week of posts</ButtonLink>
            <ButtonLink href="#dfy" variant="secondary" size="lg">Or have us post for you</ButtonLink>
          </div>
          <p className="mt-3 text-sm text-faint">14-day free trial · No credit card · Cancel anytime</p>
        </div>

        <Card className="p-5 shadow-[--shadow-lift]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">This week · Example bistro</span>
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">7 posts ready</span>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {SAMPLE_DAYS.map((x) => (
              <div key={x.d} className="flex flex-col gap-1.5">
                <span className="text-center text-xs font-semibold text-muted">{x.d}</span>
                <div className="h-16 rounded-lg" style={{ backgroundColor: x.c }} />
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-xs font-semibold text-muted">Wed · 11:30 AM · Facebook + Instagram</p>
            <p className="mt-1.5 text-[15px] leading-relaxed">
              Garlic knots or mozzarella sticks? Settle it in the comments. Winner goes on special this Friday.
            </p>
          </div>
        </Card>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto grid max-w-6xl gap-5 px-4 py-10 md:grid-cols-3">
        {[
          ["1", "Tell us your business", "Name, industry and town. That's all we need to write your first week."],
          ["2", "See your week of posts", "Captions, photo ideas and the best times to post, written for your customers. Change anything you like."],
          ["3", "Connect and go live", "Connect Facebook, Instagram and Google Business Profile. Posts go out on schedule, and any post can be shared to WhatsApp in one tap."],
        ].map(([n, t, d]) => (
          <Card key={n} className="p-6">
            <span className="font-[family-name:--font-display] text-3xl font-extrabold text-brand">{n}</span>
            <h3 className="mt-2 text-xl font-semibold">{t}</h3>
            <p className="mt-2 leading-relaxed text-muted">{d}</p>
          </Card>
        ))}
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 pb-6 pt-16">
        <h2 className="text-3xl font-extrabold md:text-4xl">Simple plans. Do it yourself, or let us do it.</h2>
        <p className="mt-2 text-lg text-muted">Every plan starts with a 14-day free trial. No credit card needed to start.</p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Card className="flex flex-col p-6">
            <h3 className="text-xl font-semibold">Free trial</h3>
            <p className="mt-1 min-h-12 text-sm text-muted">Try everything for two weeks.</p>
            <p className="mt-4"><span className="text-4xl font-extrabold">$0</span> <span className="text-muted">for 14 days</span></p>
            <ButtonLink href="/try" variant="secondary" className="mt-5">Start free</ButtonLink>
            <ul className="mt-5 space-y-2.5 text-sm">
              {["Your first week of posts, written for you", "Facebook, Instagram and Google", "No credit card needed"].map((f) => (
                <li key={f} className="flex gap-2.5"><Check />{f}</li>
              ))}
            </ul>
          </Card>

          {(Object.entries(PLANS) as [string, (typeof PLANS)[keyof typeof PLANS]][]).map(([key, plan]) => {
            const featured = key === "growth";
            const dfy = key === "managed";
            return (
              <Card
                key={key}
                className={featured ? "flex flex-col border-ink bg-ink p-6 text-white" : dfy ? "flex flex-col border-2 border-brand p-6" : "flex flex-col p-6"}
              >
                <div id={dfy ? "dfy" : undefined} className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  {featured && <span className="rounded-full bg-[--color-accent] px-2.5 py-1 text-xs font-bold text-ink">Most popular</span>}
                </div>
                <p className={featured ? "mt-1 min-h-12 text-sm text-white/75" : "mt-1 min-h-12 text-sm text-muted"}>{plan.blurb}</p>
                <p className="mt-4">
                  <span className="text-4xl font-extrabold">${plan.price}</span>{" "}
                  <span className={featured ? "text-white/75" : "text-muted"}>/month</span>
                </p>
                <ButtonLink
                  href={dfy ? "/signup" : "/try"}
                  variant={featured ? "secondary" : dfy ? "primary" : "secondary"}
                  className="mt-5"
                >
                  {dfy ? "Get started" : `Try ${plan.name} free`}
                </ButtonLink>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <span className={featured ? "text-[--color-accent]" : ""}><Check /></span>
                      {f}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Niches */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-extrabold">Posts written for your kind of business</h2>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {NICHES.map((n) => (
            <span key={n} className="rounded-full border border-line bg-surface px-4 py-2.5 text-[15px] font-medium">{n}</span>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 md:grid-cols-3">
        {[
          ["What happens after 14 days?", "Pick a plan to keep posting. If you don't, scheduled posts pause and you're never charged."],
          ["Can I post to WhatsApp?", "Yes: every post has a Share to WhatsApp button that opens WhatsApp with your caption and photo ready to send to your Status, Channel or customer groups."],
          ["Are you local?", "Yes. We're based in Carol Stream and work with businesses across DuPage County and Chicagoland."],
        ].map(([q, a]) => (
          <div key={q}>
            <h3 className="text-lg font-semibold">{q}</h3>
            <p className="mt-2 leading-relaxed text-muted">{a}</p>
          </div>
        ))}
      </section>

      <section className="bg-brand text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between">
          <h2 className="max-w-xl text-3xl font-extrabold">Your next 7 posts are about a minute away.</h2>
          <ButtonLink href="/try" size="lg" variant="secondary">Show me my week of posts</ButtonLink>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4 py-8 text-sm text-faint">
        <span>© {new Date().getFullYear()} Social Posting Inc. · socialpostinginc.com</span>
        <span className="flex gap-5">
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
        </span>
      </footer>
    </div>
  );
}
