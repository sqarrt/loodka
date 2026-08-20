-- profiles_select_own (0001_init.sql) restricts SELECT to the row owner —
-- correct for balance (private wallet amount), but display_name and
-- total_spent are meant to be shown publicly (author names on cases/items,
-- profile page headings, the level badge on someone else's profile). No
-- policy ever allowed that, so every non-owner read of another user's
-- display_name silently returned zero rows and fell back to the generic
-- "игрок" placeholder everywhere in the app — catalog author names, case
-- author names, author search suggestions, and a shared profile link
-- showing the visitor a placeholder instead of the real name.
--
-- Fix: a public view exposing only the fields meant to be public. Views
-- run with the view owner's privileges by default (not the caller's), so
-- this bypasses profiles' owner-only RLS for exactly these two columns —
-- balance and last_daily_claim_at stay inaccessible to anyone but the
-- owner via the base table's existing policy.
create view public.profile_names as
  select user_id, display_name, total_spent from public.profiles;

grant select on public.profile_names to anon, authenticated;
