# Social Posting Inc. — launch checklist

This is the Social Posting Inc. edition of [Postiz](https://github.com/gitroomhq/postiz-app)
(AGPL-3.0). Because of that licence, this repository must stay public and the
"Source code" link on the sign-in page must keep pointing at it.

## What is different from stock Postiz

- Name, logo, favicon and brand colour are Social Posting Inc.
- Plans: Starter $19 (3 channels), Growth $49 (8 channels), Pro $99 (20), Agency $199 (50).
  Yearly = 10 months' price. Edit `libraries/nestjs-libraries/src/database/prisma/subscriptions/pricing.ts`.
- Free trial is 14 days (Stripe collects a card at the start of the trial).
- Channel list trimmed to X, LinkedIn (profile + page), Instagram, Facebook, Threads, YouTube,
  Google Business Profile, TikTok, Pinterest and Bluesky. Re-enable others by uncommenting them in
  `libraries/nestjs-libraries/src/integrations/integration.manager.ts`.
- Postiz's user-count claims, testimonials and tutorial video were removed from sign-in and billing screens.
- `deploy/` holds a production Docker stack with automatic HTTPS (Caddy).

## 1. Server (about 30 minutes)

1. Buy a Hostinger VPS with **8 GB RAM** (KVM 2) and the "Ubuntu with Docker" image.
   The app is built on the server and the build alone needs about 4 GB.
2. In Hostinger DNS add an **A record**: `app` → the VPS IP address.
3. SSH into the server and run:

   ```bash
   git clone -b social-posting-inc https://github.com/syedja/socialpostinginc.git app
   cd app
   cp deploy/.env.example deploy/.env
   nano deploy/.env        # set JWT_SECRET and POSTGRES_PASSWORD (openssl rand -hex 32)
   docker compose -f deploy/docker-compose.yaml --env-file deploy/.env up -d --build
   ```

   The first build takes 15–30 minutes. Then open `https://app.socialpostinginc.com`
   and register: the first account is yours.

To update later: `git pull && docker compose -f deploy/docker-compose.yaml --env-file deploy/.env up -d --build`.

## 2. Connect social networks

Each network needs your own developer app; put its keys in `deploy/.env` and re-run the
`docker compose ... up -d` command. Start these first, they take the longest:

| Network | Where | Redirect URL to register |
|---|---|---|
| Facebook + Instagram | developers.facebook.com | `https://app.socialpostinginc.com/integrations/social/facebook` and `.../instagram` |
| Google Business Profile + YouTube | console.cloud.google.com | `.../integrations/social/gmb` and `.../youtube` |
| TikTok | developers.tiktok.com | `.../integrations/social/tiktok` |
| LinkedIn | developer.linkedin.com | `.../integrations/social/linkedin` and `.../linkedin-page` |

Confirm the exact redirect URLs and permissions against https://docs.postiz.com/providers
before submitting. Until an app passes review it normally only works for accounts listed
as testers on that developer app. Reviews ask for a privacy policy and terms page: publish them at
`https://socialpostinginc.com/privacy` and `/terms` (the sign-up form links there).

## 3. Payments

1. Create a Stripe account and copy the publishable and secret keys into `deploy/.env`.
2. In Stripe → Developers → Webhooks add `https://app.socialpostinginc.com/api/stripe`
   and copy its signing secret into `STRIPE_SIGNING_KEY`.
3. Use Stripe **test mode** keys first and run through: start trial, upgrade, cancel, failed card.
   Plans and prices are created in Stripe by the app from `pricing.ts`.

Leaving the Stripe keys blank runs the app with billing off (everything unlocked), which is
fine for a private demo but not for public sign-ups.

## 4. Optional

- `OPENAI_API_KEY` turns on AI captions and images.
- Email settings (Resend) turn on email confirmation and password resets.

## Not verified yet

These changes were type-checked but the full app was not built or run where they were written
(the database client could not be downloaded there). Treat the first deploy as the test run.
