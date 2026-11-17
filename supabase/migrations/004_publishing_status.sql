-- Migration 004: add the "publishing" status used while a post is being sent.
-- Run this on its own, BEFORE 005. (Postgres can't use a new enum value in
-- the same transaction that adds it.)

alter type public.post_status add value if not exists 'publishing';
