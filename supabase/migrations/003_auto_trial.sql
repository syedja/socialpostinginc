-- Migration 003: automatic 14-day free trial on signup, no card required.
--
-- Previously, "trialing" status only existed after a Stripe checkout, which
-- contradicted the signup page's "no credit card required" promise. This
-- makes the trial start the instant someone creates an account.

-- Extend handle_new_user() to also seed a trialing subscription row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  -- plan is null until they pick one; status alone gates access (see canPublish).
  insert into public.subscriptions (user_id, plan, status, current_period_end)
  values (new.id, null, 'trialing', now() + interval '14 days');

  return new;
end;
$$;

-- Backfill: give existing accounts created before this migration the same
-- 14-day trial, dated from now (not retroactive to their original signup).
insert into public.subscriptions (user_id, plan, status, current_period_end)
select p.id, null, 'trialing', now() + interval '14 days'
from public.profiles p
left join public.subscriptions s on s.user_id = p.id
where s.user_id is null;
