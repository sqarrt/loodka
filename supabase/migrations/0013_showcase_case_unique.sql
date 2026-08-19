-- A case can occupy at most one showcase slot per user. inventory_id is
-- already unique the same way (see 0006); case_id needs the same guarantee
-- now that a slot can hold either. Partial unique index since most rows
-- have case_id null (item slots), and a plain unique constraint would only
-- reject a second NULL if Postgres treated NULLs as equal — it doesn't, but
-- being explicit here keeps the intent obvious.
create unique index showcase_slots_case_id_unique on public.showcase_slots (case_id) where case_id is not null;
