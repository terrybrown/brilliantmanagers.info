-- Add profile fields
alter table profiles
  add column if not exists job_title text,
  add column if not exists bio text;

-- Development plans: one per user per skill
create table development_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  skill_key text not null,
  pillar text not null,
  goal text not null,
  target_date date,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, skill_key)
);

alter table development_plans enable row level security;

create policy "Users can select own plans" on development_plans
  for select using (auth.uid() = user_id);

create policy "Users can insert own plans" on development_plans
  for insert with check (auth.uid() = user_id);

create policy "Users can update own plans" on development_plans
  for update using (auth.uid() = user_id);

create policy "Users can delete own plans" on development_plans
  for delete using (auth.uid() = user_id);
