# Social Posting Inc.

Social media posting for local businesses. Next.js 15 · Tailwind v4 · Supabase (Auth, Postgres, Storage, Cron) · Stripe · Vercel.
Posts go **directly** to Facebook Pages, Instagram and Google Business Profile through their official APIs: no third-party posting service and no per-client fees. Runs on free tiers to start (Vercel Hobby + Supabase Free).

## What's in it

- **Free preview, no signup** (`/try`): a visitor enters business name, type and town and gets 7 ready-to-post captions (AI if `ANTHROPIC_API_KEY` is set, otherwise built-in templates for 7 industries). "Keep these 7 posts" carries them through signup into their Drafts.
- **14-day trial without a card**, then Starter $19 / Growth $49 / Done for you $299 via Stripe.
- **Connect accounts** with Facebook Login (Pages + linked Instagram professional accounts) and Google sign-in (Business Profile locations). Tokens are AES-256-GCM encrypted in a table only the server can read.
- **Composer**: pick platforms, write or "✨ Write with AI", attach media, publish now or schedule.
- **Scheduler**: `/api/cron/publish`, called every minute by Supabase pg_cron. Claims due posts with `FOR UPDATE SKIP LOCKED` so nothing is sent twice; Instagram videos that are still processing are finished on the next run.
- **Per-account results**: links to each live post, clear error reasons, and a **Retry** button that only resends to the accounts that failed.
- **Share to WhatsApp** on every post (opens WhatsApp with caption and photo; WhatsApp has no official API for Status or Channel posts).
- **Clients page** for admins (`ADMIN_EMAILS`) to post on behalf of Done-for-you clients.

## Setup, in order

### 1. Supabase (free)
1. Create a project. SQL Editor → run each file in `supabase/migrations/` **one at a time, in order** (001 → 006). Run **004 by itself** before 005.
   - Already ran 001–003 for the old version? Just run 004, 005, 006.
2. Before running **006**, replace `YOUR_APP_URL` and `YOUR_CRON_SECRET` in it.
3. Auth → URL Configuration: Site URL = your app URL; add `https://YOUR_APP_URL/auth/callback` as a redirect.
4. Project settings → API: copy URL, anon key, service-role key.

### 2. Meta (Facebook + Instagram)
1. developers.facebook.com → your app → add **Facebook Login** (or Facebook Login for Business) and the Pages / Instagram use cases.
2. Valid OAuth redirect URI: `https://YOUR_APP_URL/api/connect/meta/callback`
3. Permissions the app asks for (override with `META_SCOPES`): `pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish, business_management`. Meta renames permissions from time to time, so check them against your app dashboard.
4. **Until App Review approves these permissions, only people listed as admins/developers/testers on the app can connect.** That's enough to demo with your own Page. Submit for review once the app is live; reviewers want the privacy policy (`/privacy`), terms (`/terms`), a screencast of connecting and posting, and a business portfolio.
5. Instagram must be a Business or Creator account linked to the Facebook Page.

### 3. Google Business Profile
1. console.cloud.google.com → new project → enable **My Business Account Management API**, **My Business Business Information API** and **Google My Business API**.
2. OAuth consent screen + OAuth client (Web). Redirect URI: `https://YOUR_APP_URL/api/connect/google/callback`. Scope: `https://www.googleapis.com/auth/business.manage`.
3. **Apply for Business Profile API access** (Google's form). Until approved, the API quota is 0 and connecting/posting fails with a permission or quota error.

### 4. Stripe
1. Three monthly Prices: $19 (Starter), $49 (Growth), $299 (Done for you) → IDs into the env vars.
2. Webhook `https://YOUR_APP_URL/api/stripe/webhook` with `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Enable the Customer Portal.

### 5. Vercel
1. Import this repo, set the branch, add **every** variable from `.env.example`.
2. Domain: add `app.socialpostinginc.com` in Vercel, then in Hostinger DNS add the record Vercel shows you.
3. Redeploy after changing env vars.

### Local development
```bash
cp .env.example .env.local   # fill it in
npm install && npm run dev
```
Trigger the scheduler by hand: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/publish`

## Launch checklist (with real accounts)
- [ ] `/try` → 7 posts appear → "Keep these 7 posts" → sign up → posts are in Drafts
- [ ] Connected accounts → Connect Facebook & Instagram → Page and Instagram appear
- [ ] Connect Google → location appears (needs Google API access approved)
- [ ] Publish now: text post to Facebook; photo post to Facebook + Instagram + Google
- [ ] Schedule a post 5 minutes out → it goes out within a minute of its time (proves the cron)
- [ ] Instagram Reel (MP4) → shows "processing", then published within a few minutes
- [ ] Turn an account Off → posts skip it. Disconnect → token deleted
- [ ] Break something (e.g. PNG to Instagram) → Failed tab shows the reason → Retry
- [ ] Share to WhatsApp on a phone → WhatsApp opens with caption and photo
- [ ] Stripe test checkout → subscription row becomes `active`

## Verified here vs. not
Verified: `tsc` and `next build` pass; token encryption round-trips; Facebook/Instagram request formats checked against Meta's docs with a fake Graph server.
Not verified (needs live credentials): real posting to each platform, Google API access, Supabase cron calling the app, Stripe webhooks.

## Known limits
- Instagram needs at least one photo or video, and accepts JPEG photos.
- Google posts use the first photo only; videos aren't sent to Google.
- The `/try` rate limit is per server instance (best effort).
- Starter vs Growth limits (number of Pages/locations) aren't enforced in code yet.
