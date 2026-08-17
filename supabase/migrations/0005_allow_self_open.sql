create or replace function public.open_case_for_real(p_case_id uuid)
returns table (item_id text, cashback_value integer, new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_case record;
  v_items jsonb;
  v_item jsonb;
  v_last_item jsonb;
  v_picked jsonb;
  v_total_weight numeric := 0;
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

  -- Self-opens are allowed: author_share + cashback_share <= 1 makes this a
  -- zero-expected-value loop (you pay the price, get author_share back
  -- immediately and cashback_share back on cashback), not a farming exploit.

  select balance into v_balance from public.profiles where user_id = v_user_id for update;
  if v_balance is null or v_balance < v_case.price then
    raise exception 'insufficient balance';
  end if;

  select author_share, cashback_share into v_author_share, v_cashback_share
  from public.platform_config;

  v_items := v_case.items;
  for v_item in select jsonb_array_elements(v_items) loop
    v_total_weight := v_total_weight + (v_item->>'weight')::numeric;
  end loop;

  v_random := random() * v_total_weight;
  for v_item in select jsonb_array_elements(v_items) loop
    v_last_item := v_item;
    v_cumulative := v_cumulative + (v_item->>'weight')::numeric;
    if v_random < v_cumulative then
      v_picked := v_item;
      exit;
    end if;
  end loop;

  if v_picked is null then
    v_picked := v_last_item;
  end if;

  v_author_payout := floor(v_author_share * v_case.price);
  v_prob := (v_picked->>'weight')::numeric / v_total_weight;
  v_cashback := floor((v_cashback_share * v_case.price) / (jsonb_array_length(v_items) * v_prob));

  update public.profiles set balance = balance - v_case.price where user_id = v_user_id;
  update public.profiles set balance = balance + v_author_payout where user_id = v_case.user_id;

  insert into public.inventory (user_id, case_id, item_id, cashback_value)
  values (v_user_id, p_case_id, v_picked->>'id', v_cashback);

  select balance into v_balance from public.profiles where user_id = v_user_id;

  return query select (v_picked->>'id')::text, v_cashback, v_balance;
end;
$$;
