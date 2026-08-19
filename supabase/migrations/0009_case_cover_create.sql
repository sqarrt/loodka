alter table public.cases add column cover_image_path text;

drop function if exists public.create_case_with_items(text, integer, jsonb);

create or replace function public.create_case_with_items(
  p_title text,
  p_price integer,
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

grant execute on function public.create_case_with_items(text, integer, jsonb, text) to authenticated;
