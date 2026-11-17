import Link from "next/link";

export const metadata = { title: "Terms of Service — Social Posting Inc." };

// DRAFT: written as a starting point, not legal advice. Have it reviewed
// before relying on it.
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 leading-relaxed">
      <Link href="/" className="text-sm text-brand">← Social Posting Inc.</Link>
      <h1 className="mt-4 text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted">Last updated: [DATE]</p>

      <h2 className="mt-8 text-xl font-semibold">The service</h2>
      <p className="mt-2">
        Social Posting Inc. lets you write, schedule and publish posts to social accounts you own or manage. You are
        responsible for the content you publish and for following the rules of each platform (Facebook, Instagram,
        Google and WhatsApp).
      </p>

      <h2 className="mt-8 text-xl font-semibold">Trials, billing and cancellation</h2>
      <p className="mt-2">
        New accounts get a 14-day free trial without a credit card. After that, publishing requires a paid plan, billed
        monthly through Stripe. You can cancel anytime from the Billing page; your plan stays active until the end of the
        period you paid for.
      </p>

      <h2 className="mt-8 text-xl font-semibold">AI-written content</h2>
      <p className="mt-2">
        AI suggestions can contain mistakes. Review every post before it is published, especially prices, dates and offers.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Availability</h2>
      <p className="mt-2">
        We work hard to publish every post on time, but platforms can reject or delay posts, and we can&apos;t guarantee
        uninterrupted service. If a post fails, we show the reason and let you retry.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Contact</h2>
      <p className="mt-2">Social Posting Inc., Carol Stream, Illinois · [YOUR EMAIL]</p>
    </main>
  );
}
