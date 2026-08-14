-- Migration 002: swap provider from Ayrshare to Upload-Post.
-- For databases created from the original 001. Fresh installs: run 001 then 002.

alter table public.posts rename column ayrshare_post_id to provider_post_id;
alter table public.posts add column provider_kind text; -- 'job' | 'request'

-- Upload-Post profile username == the Supabase user id; no stored key needed.
alter table public.profiles drop column if exists ayrshare_profile_key;
alter table public.profiles drop column if exists ayrshare_ref_id;
