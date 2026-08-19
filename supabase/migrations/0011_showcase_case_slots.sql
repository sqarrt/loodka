alter table public.showcase_slots alter column inventory_id drop not null;
alter table public.showcase_slots add column case_id uuid references public.cases(id) on delete cascade;

alter table public.showcase_slots add constraint showcase_slots_exactly_one_target
  check (
    (inventory_id is not null and case_id is null) or
    (inventory_id is null and case_id is not null)
  );

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
  delete from public.showcase_slots where case_id = p_case_id;
end;
$$;
