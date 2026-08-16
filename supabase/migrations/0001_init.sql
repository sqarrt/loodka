create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0,
  last_daily_claim_at date,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  price integer not null check (price >= 1),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.cases enable row level security;

create policy "cases_select_all" on public.cases
  for select using (true);

create policy "cases_insert_own" on public.cases
  for insert with check (auth.uid() = user_id);

create policy "cases_update_own" on public.cases
  for update using (auth.uid() = user_id);

create policy "cases_delete_own" on public.cases
  for delete using (auth.uid() = user_id);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  item_id text not null,
  cashback_value integer not null,
  obtained_at timestamptz not null default now()
);

alter table public.inventory enable row level security;

create policy "inventory_select_all" on public.inventory
  for select using (true);

create policy "inventory_insert_own" on public.inventory
  for insert with check (auth.uid() = user_id);

create policy "inventory_delete_own" on public.inventory
  for delete using (auth.uid() = user_id);

create table public.profile_showcases (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slots jsonb not null default '[null,null,null,null,null,null,null,null,null,null,null,null]'::jsonb
);

alter table public.profile_showcases enable row level security;

create policy "profile_showcases_select_all" on public.profile_showcases
  for select using (true);

create policy "profile_showcases_insert_own" on public.profile_showcases
  for insert with check (auth.uid() = user_id);

create policy "profile_showcases_update_own" on public.profile_showcases
  for update using (auth.uid() = user_id);

create table public.platform_config (
  id boolean primary key default true,
  author_share numeric not null default 0.5,
  cashback_share numeric not null default 0.5,
  constraint single_row check (id)
);

alter table public.platform_config enable row level security;

create policy "platform_config_select_all" on public.platform_config
  for select using (true);

insert into public.platform_config (id, author_share, cashback_share)
values (true, 0.5, 0.5);
