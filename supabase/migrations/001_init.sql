-- Social Posting Inc. — initial schema
-- Run in Supabase SQL Editor (or `supabase db push`).

-- ─────────────────────────────────────────────────────────
-- profiles: one row per auth user
-- ─────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  timezone text not null default 'America/Chicago',
  -- Ayrshare user-profile key (Business plan). Encrypt at rest is handled by
  -- Supabase; this key is only ever read server-side (service role).
  ayrshare_profile_key text,
  ayrshare_ref_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────
-- posts: drafts, scheduled, published
-- ─────────────────────────────────────────────────────────
create type public.post_status as enum ('draft', 'scheduled', 'published', 'failed');

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null default '',
  platforms text[] not null default '{}',      -- e.g. {facebook,instagram,linkedin}
  media_urls text[] not null default '{}',     -- Supabase Storage public URLs
  status public.post_status not null default 'draft',
  scheduled_at timestamptz,                    -- UTC; null for drafts / publish-now
  published_at timestamptz,
  ayrshare_post_id text,                       -- Ayrshare's id, used for delete/update
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_user_status_idx on public.posts (user_id, status);
create index posts_user_scheduled_idx on public.posts (user_id, scheduled_at);

alter table public.posts enable row level security;

create policy "Users can view own posts"
  on public.posts for select using (auth.uid() = user_id);
create policy "Users can insert own posts"
  on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can update own posts"
  on public.posts for update using (auth.uid() = user_id);
create policy "Users can delete own posts"
  on public.posts for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────
-- subscriptions: mirror of Stripe state (written by webhook, service role)
-- ─────────────────────────────────────────────────────────
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text,                                    -- 'self_serve' | 'managed'
  status text,                                  -- active | trialing | past_due | canceled ...
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);
-- No insert/update policies for users: only the Stripe webhook (service role,
-- bypasses RLS) writes to this table.

-- ─────────────────────────────────────────────────────────
-- Storage: media library bucket
-- ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Users can manage only files inside a folder named after their user id.
create policy "Users upload to own folder"
  on storage.objects for insert
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users read own folder"
  on storage.objects for select
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own files"
  on storage.objects for delete
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
