-- Migration 007: handle_new_user only runs as the auth.users trigger
-- (it creates the profile row on signup). Nobody should be able to call it
-- through the public API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
