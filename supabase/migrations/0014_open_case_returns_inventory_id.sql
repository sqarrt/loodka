-- open_case_for_real didn't return the newly-inserted inventory row's id,
-- so the client had no way to target it for an immediate cash-back sale
-- right off the result screen. Add it to the return row.
-- Postgres won't let CREATE OR REPLACE change a function's return type, so
-- the old signature has to be dropped first — which also drops its grants,
-- re-issued below.
drop function if exists public.open_case_for_real(uuid);

create function public.open_case_for_real(p_case_id uuid)
returns table (item_id text, cashback_value integer, new_balance integer, inventory_id uuid)
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

  v_author_payout := floor(v_author_share * v_case.price);
  v_prob := v_picked.weight::numeric / v_total_weight;
  v_cashback := floor((v_cashback_share * v_case.price) / (v_item_count * v_prob));

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
