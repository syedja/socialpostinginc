# Social Posting Inc.

Social media scheduling SaaS. Next.js 15 · Tailwind v4 · Supabase (Auth, Postgres, Storage) · Upload-Post · Stripe · Vercel.

## Architecture

- **Auth**: Supabase Auth — email/password + Google OAuth, session refresh in `src/middleware.ts`.
- **Publishing**: Upload-Post. One Upload-Post *profile* per customer; the profile username IS the customer's Supabase user id (no extra key stored). Customers link their own accounts via Upload-Post's hosted white-label page — you never touch their credentials. White-label is included from Upload-Post's **Professional plan** up (verify current pricing at upload-post.com/pricing).
- **Scheduling**: delegated to Upload-Post's `scheduled_date` (returns a `job_id`). **No cron job needed** — runs on Vercel Hobby.
- **Editing a scheduled post**: cancel job + re-create (`PATCH /api/posts/[id]`). Cancel = `DELETE /uploadposts/schedule/{job_id}`.
- **Media routing**: video → `/upload`, photos (up to 10, by URL) → `/upload_photos`, text-only → `/upload_text`. Instagram/TikTok/Pinterest require media — enforced in the composer AND the API.
- **Facebook/Pinterest targets**: first Page/board is auto-selected server-side.
- **Plan gating**: publishing/scheduling requires an `active` or `trialing` Stripe subscription. Drafts are always free.
- **Managed plan ($399)**: emails in `ADMIN_EMAILS` see a **Clients** page listing all customers, and can compose/schedule/edit/cancel on any client's behalf (service-role, explicitly scoped). Self-serve ($29) customers do everything themselves.
- **Billing**: Stripe Checkout (14-day trial) + Customer Portal + webhook → `subscriptions` table.

## Setup (in order)

### 1. Supabase
1. Create project → SQL Editor → run `supabase/migrations/001_init.sql`, then `002_upload_post.sql`.
2. Auth → Providers: enable Email + Google (Google Cloud OAuth client needed).
3. Auth → URL Configuration: Site URL + `https://socialpostinginc.com/auth/callback` redirect.
4. Copy URL, anon key, service-role key → `.env.local`.

### 2. Upload-Post
1. Create account → app.upload-post.com/api-keys → copy key to `UPLOADPOST_API_KEY`.
2. Plan: free tier = 10 uploads/mo (fine for testing). For customers, you need a paid plan with enough **profiles** (1 per customer) and white-label (Professional+). Approx (verify!): ~$24/mo → 5 profiles, ~$50/mo → 25.
3. ⚠️ Endpoints in `src/lib/social-provider.ts` were verified against their official SDK v2.9.0 and docs (Aug 2026) — but do one real end-to-end test before launch.

### 3. Stripe
1. Two recurring Prices: $29 (self_serve), $399 (managed) → IDs in `.env.local`.
2. Webhook endpoint `https://YOURDOMAIN/api/stripe/webhook`, events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Enable Customer Portal.

### 4. Env + deploy
```bash
cp .env.example .env.local  # fill everything, incl. ADMIN_EMAILS=your@email
npm install && npm run dev  # verify locally first
```
Deploy: push to GitHub → import in Vercel → add ALL env vars → set `NEXT_PUBLIC_APP_URL` to production URL → point Hostinger DNS (A 76.76.21.21, CNAME www → cname.vercel-dns.com).

## Pre-launch verification checklist (do with REAL accounts)

Self-serve ($29) flow:
- [ ] Sign up (email + Google) → dashboard loads
- [ ] Billing → choose Self-Serve → Stripe test checkout → webhook writes `subscriptions` row (`trialing`)
- [ ] Connected accounts → Connect → Upload-Post hosted page → link 1 real platform → returns to /accounts showing "Connected"
- [ ] Compose text post → Publish now → appears on the platform
- [ ] Compose with image from Media library → Schedule 10 min out → fires on time
- [ ] Edit the scheduled post (content + time) → old job cancelled, new one fires
- [ ] Cancel a scheduled post → does not fire
- [ ] Save draft → edit draft → publish
- [ ] Calendar shows scheduled + published on correct days in user timezone
- [ ] Without subscription: publish attempt shows the "start your trial" message

Managed ($399) flow:
- [ ] Your email in ADMIN_EMAILS → "Clients" appears in sidebar
- [ ] Open client → Compose for client banner shows → schedule a post → lands on client's account
- [ ] Client sees the scheduled post in THEIR dashboard/calendar

Verified in build environment: `tsc --noEmit` and `next build` pass (19 routes). NOT verified here (no live credentials): actual Upload-Post publishing, Google OAuth round-trip, Stripe webhooks — hence the checklist above.

## Known v1 constraints
- One video OR up to 10 photos per post (not both) — Upload-Post constraint.
- Facebook posts go to the customer's **first** Page; Pinterest to first board. Multi-page selection is a fast follow.
- Text-only posts can't go to Instagram/TikTok/Pinterest (platform rules) — the UI explains this.
- Character limits in `limits.ts` are approximate; X strips URLs from captions (their pricing rule).
