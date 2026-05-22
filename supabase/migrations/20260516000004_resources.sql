-- supabase/migrations/004_resources.sql
create table public.resources (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  url           text not null unique,
  description   text not null,
  resource_type text not null check (resource_type in ('book','article','course','video','person','podcast','tool')),
  author        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.resources enable row level security;

-- Public catalogue: anyone can read, writes only via service role key
create policy "Public can read resources"
  on public.resources for select using (true);

create table public.skill_resources (
  resource_id     uuid not null references public.resources(id) on delete cascade,
  skill_key       text not null,
  relevance_score int  not null default 3 check (relevance_score between 1 and 5),
  primary key (resource_id, skill_key)
);

alter table public.skill_resources enable row level security;

create policy "Public can read skill_resources"
  on public.skill_resources for select using (true);
