-- Migration 005: direct posting to Facebook, Instagram and Google Business
-- Profile (replaces Upload-Post). Run after 004.

-- ─────────────────────────────────────────────────────────
-- social_accounts: one row per connected Page / IG account / GBP location
-- ─────────────────────────────────────────────────────────
create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram', 'google_business')),
  external_id text not null,          -- FB page id, IG user id, or accounts/x/locations/y
  name text not null default '',
  picture_url text,
  enabled boolean not null default true,   -- posts go to every enabled account of a platform
  status text not null default 'connected', -- connected | needs_reconnect
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform, external_id)
);

create index if not exists social_accounts_user_idx on public.social_accounts (user_id, platform);

alter table public.social_accounts enable row level security;

create policy "Users view own social accounts"
  on public.social_accounts for select using (auth.uid() = user_id);
create policy "Users update own social accounts"
  on public.social_accounts for update using (auth.uid() = user_id);
create policy "Users delete own social accounts"
  on public.social_accounts for delete using (auth.uid() = user_id);

-- Users may only flip the on/off switch themselves; everything else is
-- written server-side with the service role.
revoke update on public.social_accounts from authenticated;
grant update (enabled, updated_at) on public.social_accounts to authenticated;

-- ─────────────────────────────────────────────────────────
-- social_tokens: encrypted access/refresh tokens. No RLS policies at all,
-- so only the service role (server) can read or write them.
-- ─────────────────────────────────────────────────────────
create table if not exists public.social_tokens (
  account_id uuid primary key references public.social_accounts (id) on delete cascade,
  access_token text not null,   -- AES-256-GCM encrypted (see src/lib/crypto.ts)
  refresh_token text,           -- encrypted; Google only
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.social_tokens enable row level security;

-- ─────────────────────────────────────────────────────────
-- posts: per-account results and scheduler bookkeeping
-- ─────────────────────────────────────────────────────────
alter table public.posts add column if not exists results jsonb not null default '{}'::jsonb;
alter table public.posts add column if not exists attempts int not null default 0;
alter table public.posts add column if not exists locked_at timestamptz;
alter table public.posts add column if not exists source text; -- e.g. 'try' for posts from the free preview

create index if not exists posts_due_idx on public.posts (status, scheduled_at);

-- ─────────────────────────────────────────────────────────
-- claim_due_posts: atomically hands the scheduler the next batch of posts
-- that are due. SKIP LOCKED means two overlapping runs never send the same
-- post twice. Posts stuck in "publishing" for 10+ minutes (a crashed run)
-- are picked up again.
-- ─────────────────────────────────────────────────────────
create or replace function public.claim_due_posts(max_posts int default 5)
returns setof public.posts
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.posts p
     set status = 'publishing',
         locked_at = now(),
         attempts = p.attempts + 1,
         updated_at = now()
   where p.id in (
     select q.id from public.posts q
      where (q.status = 'scheduled' and q.scheduled_at <= now())
         or (q.status = 'publishing' and q.locked_at < now() - interval '10 minutes')
      order by q.scheduled_at nulls first
      limit max_posts
      for update skip locked
   )
  returning p.*;
end;
$$;

revoke execute on function public.claim_due_posts(int) from public, anon, authenticated;
grant execute on function public.claim_due_posts(int) to service_role;
