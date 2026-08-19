drop function if exists public.update_case_with_items(uuid, text, integer, jsonb);

create or replace function public.update_case_with_items(
  p_case_id uuid,
  p_title text,
  p_price integer,
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

grant execute on function public.update_case_with_items(uuid, text, integer, jsonb, text) to authenticated;
