-- 멤버십: profiles 테이블 (premium_until 기반 프리미엄 판정)
-- 실행: web Supabase 프로젝트(uonznnypdnerdigfyfci) 대시보드 → SQL Editor 에 붙여넣고 Run.
-- 멱등(idempotent) — 여러 번 실행해도 안전.

-- 1) 테이블
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  premium_until timestamptz,                                   -- null 또는 과거 = 무료, 미래 = 프리미엄(트라이얼 포함)
  referral_code text unique,                                   -- 친구초대용 (로직은 다음 단계)
  referred_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- 2) RLS — 본인 row만 조회/수정
alter table public.profiles enable row level security;

drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 3) 가입 시 profiles row + 7일 트라이얼 자동 부여
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, premium_until, referral_code)
  values (
    new.id,
    new.email,
    now() + interval '7 days',
    'gc_' || substr(replace(new.id::text, '-', ''), 1, 10)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) 기존 가입자 백필 (트리거 도입 전 유저) — row만 생성, 트라이얼 없음(premium_until null)
--    기존 유저에게도 7일 트라이얼을 주려면 아래 premium_until 줄의 주석을 해제.
insert into public.profiles (id, email, referral_code)
select
  u.id,
  u.email,
  'gc_' || substr(replace(u.id::text, '-', ''), 1, 10)
from auth.users u
on conflict (id) do nothing;
-- update public.profiles set premium_until = now() + interval '7 days'
--   where premium_until is null;
