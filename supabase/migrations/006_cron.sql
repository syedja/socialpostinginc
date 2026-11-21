-- Migration 006: run the publisher every minute from Supabase.
--
-- BEFORE RUNNING: replace the two placeholders below:
--   YOUR_APP_URL     e.g. https://app.socialpostinginc.com
--   YOUR_CRON_SECRET the same value as CRON_SECRET in Vercel's env vars
--
-- Uses Supabase's pg_cron and pg_net extensions. If you'd rather not use
-- these, any free "call a URL every minute" service (for example
-- cron-job.org) can call GET YOUR_APP_URL/api/cron/publish with the header
-- "Authorization: Bearer YOUR_CRON_SECRET" instead.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'spi-publish-due-posts',
  '* * * * *',
  $$
  select net.http_post(
    url := 'YOUR_APP_URL/api/cron/publish',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- To stop it later:  select cron.unschedule('spi-publish-due-posts');
