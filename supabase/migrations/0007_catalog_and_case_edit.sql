-- 1. profiles.display_name — auto-populated at login (see auth/callback),
-- backfilled here from auth.users.email for accounts that already exist.
alter table public.profiles add column display_name text;

update public.profiles p
set display_name = split_part(u.email, '@', 1)
from auth.users u
where u.id = p.user_id and p.display_name is null;

update public.profiles set display_name = 'игрок' where display_name is null;

alter table public.profiles alter column display_name set not null;

-- 2. cases.open_count — real-open popularity counter for catalog sorting.
-- Demo opens never call open_case_for_real, so they never increment this.
alter table public.cases add column open_count integer not null default 0;

create or replace function public.open_case_for_real(p_case_id uuid)
returns table (item_id text, cashback_value integer, new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_case record;
  v_item record;
  v_last_item record;
  v_picked record;
  v_total_weight numeric := 0;
  v_item_count integer := 0;
  v_cumulative numeric := 0;
  v_random numeric;
  v_author_share numeric;
  v_cashback_share numeric;
  v_author_payout integer;
  v_cashback integer;
  v_balance integer;
  v_prob numeric;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_case from public.cases where id = p_case_id;
  if not found then
    raise exception 'case not found';
  end if;

  select balance into v_balance from public.profiles where user_id = v_user_id for update;
  if v_balance is null or v_balance < v_case.price then
    raise exception 'insufficient balance';
  end if;

  select author_share, cashback_share into v_author_share, v_cashback_share
  from public.platform_config;

  select count(*), coalesce(sum(weight), 0) into v_item_count, v_total_weight
  from public.case_items where case_id = p_case_id and not removed;

  if v_item_count = 0 then
    raise exception 'case has no items';
  end if;

  v_random := random() * v_total_weight;
  for v_item in
    select id, weight from public.case_items
    where case_id = p_case_id and not removed
    order by position
  loop
    v_last_item := v_item;
    v_cumulative := v_cumulative + v_item.weight;
    if v_random < v_cumulative then
      v_picked := v_item;
      exit;
    end if;
  end loop;

  if v_picked is null then
    v_picked := v_last_item;
  end if;

  v_author_payout := floor(v_author_share * v_case.price);
  v_prob := v_picked.weight::numeric / v_total_weight;
  v_cashback := floor((v_cashback_share * v_case.price) / (v_item_count * v_prob));

  update public.profiles set balance = balance - v_case.price where user_id = v_user_id;
  update public.profiles set balance = balance + v_author_payout where user_id = v_case.user_id;
  update public.cases set open_count = open_count + 1 where id = p_case_id;

  insert into public.inventory (user_id, case_id, item_id, cashback_value)
  values (v_user_id, p_case_id, v_picked.id, v_cashback);

  select balance into v_balance from public.profiles where user_id = v_user_id;

  return query select v_picked.id::text, v_cashback, v_balance;
end;
$$;

-- 3. cases.deleted_at — soft delete. A hard delete would cascade to
-- case_items, which inventory.item_id references without ON DELETE CASCADE
-- (by design — a dropped case must not erase items already in players'
-- inventories). Catalog/case-page queries filter deleted_at is null.
alter table public.cases add column deleted_at timestamptz;

-- 4. update_case_with_items — atomic title/price/items edit for the case
-- author. Existing items are matched by id and updated in place (name,
-- weight, position, removed); items with no id are inserted as new. Items
-- already in the table but absent from p_items are left untouched — the
-- caller is expected to send every existing item explicitly (soft-removed
-- ones included) so this function never has to guess intent.
create or replace function public.update_case_with_items(
  p_case_id uuid,
  p_title text,
  p_price integer,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner uuid;
  v_item jsonb;
  v_position integer := 0;
  v_item_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select user_id into v_owner from public.cases where id = p_case_id;
  if v_owner is null then
    raise exception 'case not found';
  end if;
  if v_owner <> v_user_id then
    raise exception 'not the case author';
  end if;

  update public.cases set title = p_title, price = p_price where id = p_case_id;

  for v_item in select jsonb_array_elements(p_items) loop
    v_item_id := nullif(v_item->>'id', '')::uuid;
    if v_item_id is null then
      insert into public.case_items (case_id, name, image_path, weight, position, removed)
      values (
        p_case_id,
        v_item->>'name',
        v_item->>'image_path',
        (v_item->>'weight')::integer,
        v_position,
        false
      );
    else
      update public.case_items
      set
        name = v_item->>'name',
        weight = (v_item->>'weight')::integer,
        position = v_position,
        removed = (v_item->>'removed')::boolean
      where id = v_item_id and case_id = p_case_id;
    end if;
    v_position := v_position + 1;
  end loop;
end;
$$;

grant execute on function public.update_case_with_items(uuid, text, integer, jsonb) to authenticated;

-- 5. delete_case_soft — author-only soft delete.
create or replace function public.delete_case_soft(p_case_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select user_id into v_owner from public.cases where id = p_case_id;
  if v_owner is null then
    raise exception 'case not found';
  end if;
  if v_owner <> v_user_id then
    raise exception 'not the case author';
  end if;

  update public.cases set deleted_at = now() where id = p_case_id;
end;
$$;

grant execute on function public.delete_case_soft(uuid) to authenticated;
