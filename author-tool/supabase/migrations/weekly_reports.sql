-- Weekly GA4 reports: stored snapshot + AI summary for each ISO week.
-- Run this in Supabase SQL Editor once.

create table if not exists public.weekly_reports (
  id           uuid primary key default gen_random_uuid(),
  week_start   date not null,
  week_end     date not null,
  data         jsonb not null,
  ai_summary   text,
  highlights   jsonb,
  status       text not null default 'ready',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (week_start)
);

create index if not exists weekly_reports_week_start_idx
  on public.weekly_reports (week_start desc);

alter table public.weekly_reports enable row level security;

-- Service role bypasses RLS. We still add a read-only policy for anon, in
-- case the site ever wants to surface these publicly. Disabled by default.
drop policy if exists weekly_reports_anon_read on public.weekly_reports;
create policy weekly_reports_anon_read
  on public.weekly_reports for select
  to anon
  using (false);

-- Keep updated_at fresh.
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists weekly_reports_set_updated_at on public.weekly_reports;
create trigger weekly_reports_set_updated_at
  before update on public.weekly_reports
  for each row execute function public.set_updated_at();
