-- profiles: extends auth.users, created on first sign-in
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  email text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- assessment_rounds: one per reflection session, never overwritten
create table assessment_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'complete')),
  created_at timestamptz default now(),
  completed_at timestamptz
);
alter table assessment_rounds enable row level security;
create policy "Users can manage own rounds" on assessment_rounds
  for all using (auth.uid() = user_id);

-- scores: one row per skill per round
create table scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references assessment_rounds on delete cascade,
  pillar text not null,
  skill_key text not null,
  level text not null check (level in ('Needs Improvement', 'Basic', 'Proficient', 'Advanced', 'Expert')),
  scored_at timestamptz default now(),
  unique (round_id, skill_key)
);
alter table scores enable row level security;
create policy "Users can manage scores for own rounds" on scores
  for all using (
    exists (
      select 1 from assessment_rounds
      where id = scores.round_id and user_id = auth.uid()
    )
  );
create policy "Managers can read scores for direct reports" on scores
  for select using (
    exists (
      select 1 from assessment_rounds ar
      join connections c on c.direct_report_id = ar.user_id
      where ar.id = scores.round_id
        and c.manager_id = auth.uid()
        and c.status = 'active'
    )
  );

-- connections: bidirectional manager/direct-report link
create table connections (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references profiles on delete cascade,
  direct_report_id uuid not null references profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active')),
  initiated_by uuid not null references profiles on delete cascade,
  created_at timestamptz default now(),
  unique (manager_id, direct_report_id)
);
alter table connections enable row level security;
create policy "Users can read connections they are part of" on connections
  for select using (auth.uid() = manager_id or auth.uid() = direct_report_id);
create policy "Users can create connections involving themselves" on connections
  for insert with check (
    auth.uid() = initiated_by and
    (auth.uid() = manager_id or auth.uid() = direct_report_id)
  );
create policy "Users can update connections they are part of" on connections
  for update using (auth.uid() = manager_id or auth.uid() = direct_report_id);

-- manager_scores: manager's ratings linked to the direct report's round
create table manager_scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references assessment_rounds on delete cascade,
  manager_id uuid not null references profiles on delete cascade,
  skill_key text not null,
  level text not null check (level in ('Needs Improvement', 'Basic', 'Proficient', 'Advanced', 'Expert')),
  scored_at timestamptz default now(),
  unique (round_id, manager_id, skill_key)
);
alter table manager_scores enable row level security;
create policy "Managers can manage their own manager scores" on manager_scores
  for all using (auth.uid() = manager_id);
create policy "Direct reports can read their manager scores" on manager_scores
  for select using (
    exists (
      select 1 from assessment_rounds
      where id = manager_scores.round_id and user_id = auth.uid()
    )
  );
