alter table public.case_items add column description text;

create or replace function public.create_case_with_items(
  p_title text,
  p_price integer,
  p_items jsonb
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

  insert into public.cases (user_id, title, price)
  values (v_user_id, p_title, p_price)
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
