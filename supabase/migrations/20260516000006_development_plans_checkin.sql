-- supabase/migrations/006_development_plans_checkin.sql
alter table public.development_plans
  add column if not exists checkin_frequency_weeks int,
  add column if not exists last_checkin_at         timestamptz;
