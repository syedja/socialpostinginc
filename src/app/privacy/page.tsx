import Link from "next/link";

export const metadata = { title: "Privacy Policy — Social Posting Inc." };

// DRAFT: written as a starting point, not legal advice. Have it reviewed
// before relying on it, and keep it in sync with what the app actually does.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 leading-relaxed">
      <Link href="/" className="text-sm text-brand">← Social Posting Inc.</Link>
      <h1 className="mt-4 text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: [DATE]</p>

      <h2 className="mt-8 text-xl font-semibold">What we collect</h2>
      <ul className="mt-2 list-disc space-y-1 ps-6">
        <li>Account details: your name, email address and time zone.</li>
        <li>Content you create: post text, photos and videos you upload, and when you schedule them.</li>
        <li>
          Connected accounts: when you connect Facebook, Instagram or Google Business Profile, we store the name and ID
          of each Page, account or location you choose, and an access token that lets us publish on your behalf. Tokens
          are encrypted. We never see or store your passwords.
        </li>
        <li>Billing: payments are handled by Stripe. We store your subscription status, not your card number.</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">How we use it</h2>
      <p className="mt-2">
        Only to provide the service: to publish the posts you create or approve to the accounts you connect, at the times
        you choose, and to bill your subscription. We do not sell your data or use your connected accounts for anything
        else. If you use AI writing, the text you provide is sent to our AI provider to generate captions.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Disconnecting and deleting your data</h2>
      <p className="mt-2">
        You can disconnect any account at any time on the Connected accounts page; its token is deleted immediately. You
        can also remove our access from your Facebook settings (Settings &amp; privacy → Business integrations) or your
        Google account (Security → Third-party access). To delete your whole account and all of its data, email
        [YOUR EMAIL] from the address you signed up with and we will delete it within 30 days.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Contact</h2>
      <p className="mt-2">Social Posting Inc., Carol Stream, Illinois · [YOUR EMAIL]</p>
    </main>
  );
}
