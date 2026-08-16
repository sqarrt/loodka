create or replace function public.cash_back_item(p_inventory_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row record;
  v_slots jsonb;
  v_new_slots jsonb;
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

  select slots into v_slots from public.profile_showcases where user_id = v_user_id;
  if v_slots is not null then
    select jsonb_agg(
      case when elem = to_jsonb(p_inventory_id::text) then 'null'::jsonb else elem end
      order by ord
    )
    into v_new_slots
    from jsonb_array_elements(v_slots) with ordinality as t(elem, ord);

    update public.profile_showcases set slots = v_new_slots where user_id = v_user_id;
  end if;

  return v_row.cashback_value;
end;
$$;
