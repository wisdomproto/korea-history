-- 멤버십 정기결제(토스 빌링) — profiles 확장 + 민감정보 격리 테이블
-- 실행: uonzn 대시보드 SQL Editor. 0001_profiles.sql 이후 실행. 멱등.

-- 1) profiles 확장 — 구독 상태/만료일 (본인 read 허용해도 안전, UI 표시용)
alter table public.profiles
  add column if not exists subscription_status text not null default 'none', -- none | active | canceled
  add column if not exists current_period_end timestamptz,
  add column if not exists last_payment_at timestamptz;
-- premium_until(0001) = current_period_end 로 갱신 → 기존 게이팅이 그대로 프리미엄 인식.

-- 2) billing_accounts — 결제수단 토큰(billing_key)은 민감 → 클라 접근 0, service role만.
--    RLS enable + 정책 없음 = anon/authenticated 는 select/insert/update 전부 불가.
create table if not exists public.billing_accounts (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  customer_key text not null,
  billing_key  text not null,
  card_company text,
  card_number  text,            -- 마스킹된 뒷4자리 등 (토스가 마스킹 반환)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.billing_accounts enable row level security;
-- (정책 없음 — service role 키로만 접근)

-- 3) payments — 결제 이력 (감사/환불용). 본인 read 허용.
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  order_id     text not null unique,
  amount       integer not null,
  status       text not null,          -- DONE | CANCELED | FAILED
  payment_key  text,
  approved_at  timestamptz,
  created_at   timestamptz not null default now()
);
alter table public.payments enable row level security;
drop policy if exists "payments self select" on public.payments;
create policy "payments self select" on public.payments
  for select using (auth.uid() = user_id);
-- insert/update 는 service role 만 (정책 없음).
