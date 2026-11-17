-- Sultan Sofrası · QR sipariş sistemi · veritabanı şeması
-- Supabase SQL Editor'da (veya migration olarak) bir kez çalıştırın.
-- RLS açık ve HİÇ policy yok: tarayıcıdan (anon key) tabloya erişilemez.
-- Tüm okuma/yazma, service_role anahtarıyla Vercel API fonksiyonlarından yapılır.

create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  order_no    bigint generated always as identity,
  table_no    integer not null check (table_no between 1 and 999),
  items       jsonb not null,
  note        text,
  total       numeric(10,2) not null check (total >= 0),
  status      text not null default 'new'
              check (status in ('new','preparing','ready','served','cancelled')),
  ip_hash     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists orders_status_idx   on public.orders (status, created_at);
create index if not exists orders_table_idx    on public.orders (table_no, created_at desc);
create index if not exists orders_iphash_idx   on public.orders (ip_hash, created_at desc);

alter table public.orders enable row level security;
