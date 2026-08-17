-- 1. case_items table
create table public.case_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  name text not null,
  image_path text not null,
  weight integer not null check (weight > 0),
  position integer not null,
  removed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.case_items enable row level security;
grant select, insert, update, delete on public.case_items to anon, authenticated, service_role;

create policy "case_items_select_all" on public.case_items
  for select using (true);

create policy "case_items_insert_own" on public.case_items
  for insert with check (
    exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid())
  );

create policy "case_items_update_own" on public.case_items
  for update using (
    exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid())
  );

create policy "case_items_delete_own" on public.case_items
  for delete using (
    exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid())
  );

-- 2. Backfill case_items from cases.items, preserving original item IDs
insert into public.case_items (id, case_id, name, image_path, weight, position)
select
  (item->>'id')::uuid,
  c.id,
  item->>'name',
  item->>'image_path',
  (item->>'weight')::integer,
  (ord - 1)::integer
from public.cases c, jsonb_array_elements(c.items) with ordinality as t(item, ord);

-- 3. inventory.item_id: text -> uuid references case_items(id)
alter table public.inventory add column item_id_new uuid;
update public.inventory set item_id_new = item_id::uuid;
alter table public.inventory alter column item_id_new set not null;
alter table public.inventory add constraint inventory_item_id_fkey
  foreign key (item_id_new) references public.case_items(id);
alter table public.inventory drop column item_id;
alter table public.inventory rename column item_id_new to item_id;

-- 4. showcase_slots table
create table public.showcase_slots (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  slot_index smallint not null check (slot_index between 0 and 11),
  inventory_id uuid not null references public.inventory(id) on delete cascade,
  primary key (user_id, slot_index),
  unique (inventory_id)
);

alter table public.showcase_slots enable row level security;
grant select, insert, update, delete on public.showcase_slots to anon, authenticated, service_role;

create policy "showcase_slots_select_all" on public.showcase_slots
  for select using (true);

create policy "showcase_slots_insert_own" on public.showcase_slots
  for insert with check (auth.uid() = user_id);

create policy "showcase_slots_update_own" on public.showcase_slots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "showcase_slots_delete_own" on public.showcase_slots
  for delete using (auth.uid() = user_id);

-- 5. Backfill showcase_slots from profile_showcases.slots (skip stale refs)
insert into public.showcase_slots (user_id, slot_index, inventory_id)
select
  ps.user_id,
  (ord - 1)::smallint,
  elem::uuid
from public.profile_showcases ps,
     jsonb_array_elements_text(ps.slots) with ordinality as t(elem, ord)
where elem is not null
  and exists (select 1 from public.inventory i where i.id = elem::uuid);

-- 6. Drop the JSONB columns/table
alter table public.cases drop column items;
drop table public.profile_showcases;

-- 7. Redefine open_case_for_real to query case_items instead of jsonb
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

  insert into public.inventory (user_id, case_id, item_id, cashback_value)
  values (v_user_id, p_case_id, v_picked.id, v_cashback);

  select balance into v_balance from public.profiles where user_id = v_user_id;

  return query select v_picked.id::text, v_cashback, v_balance;
end;
$$;

-- 8. Redefine cash_back_item — showcase cleanup is now automatic via FK cascade
create or replace function public.cash_back_item(p_inventory_id uuid)
returns integer
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

-- 9. New: create_case_with_items — atomic case + items insert
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
    insert into public.case_items (case_id, name, image_path, weight, position)
    values (
      v_case_id,
      v_item->>'name',
      v_item->>'image_path',
      (v_item->>'weight')::integer,
      v_position
    );
    v_position := v_position + 1;
  end loop;

  return v_case_id;
end;
$$;

grant execute on function public.create_case_with_items(text, integer, jsonb) to authenticated;
