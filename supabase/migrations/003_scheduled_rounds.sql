create table public.scheduled_rounds (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  scheduled_date date not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id)
);

alter table public.scheduled_rounds enable row level security;

create policy "Users manage own scheduled rounds"
  on public.scheduled_rounds
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
