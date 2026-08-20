-- Лудки move from integer to numeric(12,2) — the integer-only cashback
-- formula was flooring to 0 for common items in cheap cases. Existing
-- integer data converts losslessly; case_items.weight is untouched (it's
-- drop-odds, not currency).

alter table public.profiles alter column balance type numeric(12,2);
alter table public.profiles alter column total_spent type numeric(12,2);
alter table public.cases alter column price type numeric(12,2);
alter table public.inventory alter column cashback_value type numeric(12,2);

-- open_case_for_real — return type changes, so drop first (Postgres won't
-- let CREATE OR REPLACE change it), same as the last time this happened
-- (see 0014's comment).
drop function if exists public.open_case_for_real(uuid);

create function public.open_case_for_real(p_case_id uuid)
returns table (item_id text, cashback_value numeric, new_balance numeric, inventory_id uuid)
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
  v_author_payout numeric;
  v_cashback numeric;
  v_balance numeric;
  v_prob numeric;
  v_inventory_id uuid;
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

  v_author_payout := round(v_author_share * v_case.price, 2);
  v_prob := v_picked.weight::numeric / v_total_weight;
  -- greatest(..., 0.01): round() alone can still land on 0.00 for a very
  -- common item in a very cheap case — an item should never sell for
  -- literally nothing.
  v_cashback := greatest(round((v_cashback_share * v_case.price) / (v_item_count * v_prob), 2), 0.01);

  update public.profiles set balance = balance - v_case.price, total_spent = total_spent + v_case.price where user_id = v_user_id;
  update public.profiles set balance = balance + v_author_payout where user_id = v_case.user_id;
  update public.cases set open_count = open_count + 1 where id = p_case_id;

  insert into public.inventory (user_id, case_id, item_id, cashback_value)
  values (v_user_id, p_case_id, v_picked.id, v_cashback)
  returning id into v_inventory_id;

  select balance into v_balance from public.profiles where user_id = v_user_id;

  return query select v_picked.id::text, v_cashback, v_balance, v_inventory_id;
end;
$$;

grant execute on function public.open_case_for_real(uuid) to authenticated;

-- cash_back_item — return type changes too.
drop function if exists public.cash_back_item(uuid);

create function public.cash_back_item(p_inventory_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row record;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row from public.inventory
  where id = p_inventory_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'item not found';
  end if;

  delete from public.inventory where id = p_inventory_id;
  update public.profiles set balance = balance + v_row.cashback_value where user_id = v_user_id;

  return v_row.cashback_value;
end;
$$;

grant execute on function public.cash_back_item(uuid) to authenticated;

-- create_case_with_items / update_case_with_items — p_price integer -> numeric.
drop function if exists public.create_case_with_items(text, integer, jsonb, text);

create function public.create_case_with_items(
  p_title text,
  p_price numeric,
  p_items jsonb,
  p_cover_image_path text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_case_id uuid;
  v_item jsonb;
  v_position integer := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.cases (user_id, title, price, cover_image_path)
  values (v_user_id, p_title, p_price, p_cover_image_path)
  returning id into v_case_id;

  for v_item in select jsonb_array_elements(p_items) loop
    insert into public.case_items (case_id, name, image_path, weight, position, description)
    values (
      v_case_id,
      v_item->>'name',
      v_item->>'image_path',
      (v_item->>'weight')::integer,
      v_position,
      nullif(v_item->>'description', '')
    );
    v_position := v_position + 1;
  end loop;

  return v_case_id;
end;
$$;

grant execute on function public.create_case_with_items(text, numeric, jsonb, text) to authenticated;

drop function if exists public.update_case_with_items(uuid, text, integer, jsonb, text);

create function public.update_case_with_items(
  p_case_id uuid,
  p_title text,
  p_price numeric,
  p_items jsonb,
  p_cover_image_path text
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

  update public.cases
  set
    title = p_title,
    price = p_price,
    cover_image_path = coalesce(p_cover_image_path, cover_image_path)
  where id = p_case_id;

  for v_item in select jsonb_array_elements(p_items) loop
    v_item_id := nullif(v_item->>'id', '')::uuid;
    if v_item_id is null then
      insert into public.case_items (case_id, name, image_path, weight, position, removed, description)
      values (
        p_case_id,
        v_item->>'name',
        v_item->>'image_path',
        (v_item->>'weight')::integer,
        v_position,
        false,
        nullif(v_item->>'description', '')
      );
    else
      update public.case_items
      set
        name = v_item->>'name',
        weight = (v_item->>'weight')::integer,
        position = v_position,
        removed = (v_item->>'removed')::boolean,
        description = nullif(v_item->>'description', '')
      where id = v_item_id and case_id = p_case_id;
    end if;
    v_position := v_position + 1;
  end loop;
end;
$$;

grant execute on function public.update_case_with_items(uuid, text, numeric, jsonb, text) to authenticated;
