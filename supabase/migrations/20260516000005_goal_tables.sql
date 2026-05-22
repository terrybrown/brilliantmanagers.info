-- supabase/migrations/005_goal_tables.sql
create table public.goal_resources (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.development_plans(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (plan_id, resource_id)
);

alter table public.goal_resources enable row level security;

create policy "Users manage own goal resources"
  on public.goal_resources for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.goal_evidence (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.development_plans(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  what_you_did text not null,
  impact       text not null,
  url          text,
  created_at   timestamptz not null default now()
);

alter table public.goal_evidence enable row level security;

create policy "Users manage own evidence"
  on public.goal_evidence for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
