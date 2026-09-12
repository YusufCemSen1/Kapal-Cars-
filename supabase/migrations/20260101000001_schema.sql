-- =====================================================================
--  ORTACI+ — Şoför / Ortacı / Yönetici operasyon sistemi
--  01_schema.sql : tablolar, tipler, indeksler
--  Supabase SQL Editor'de sırayla 01 -> 02 -> 03 -> 04 çalıştırın.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- tipler
do $$ begin
  create type user_role as enum ('admin','sofor','ortaci');
exception when duplicate_object then null; end $$;

do $$ begin
  -- bekliyor   : şoför bildirdi, henüz ortacı almadı
  -- atandi     : bir ortacıya atandı / ortacı üstlendi
  -- alindi     : ortacı müşteriyi teslim aldı
  -- tamamlandi : alışveriş bitti
  -- iptal      : iptal edildi
  create type trip_status as enum ('bekliyor','atandi','alindi','tamamlandi','iptal');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------- profiller
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text        not null unique
                check (username = lower(username)
                       and username ~ '^[a-z0-9._]{3,24}$'),
  full_name     text        not null,
  role          user_role   not null,
  phone         text,
  is_active     boolean     not null default true,
  is_available  boolean     not null default false,   -- ortacı yeşil/kırmızı
  last_assigned_at timestamptz,                        -- sıralı otomatik atama için
  created_at    timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles(role) where is_active;

-- --------------------------------------------- gizli giriş bilgileri
-- Sadece service_role erişir (RLS açık, hiçbir policy yok).
create table if not exists public.user_secrets (
  profile_id       uuid primary key references public.profiles(id) on delete cascade,
  code_hash        text not null,            -- bcrypt(kişisel şifre)
  auth_email       text not null,
  auth_password    text not null,
  updated_at       timestamptz not null default now()
);

-- --------------------------------------------------------------- mağazalar
create table if not exists public.shops (
  id              uuid primary key default extensions.gen_random_uuid(),
  name            text not null unique,
  commission_rate numeric(5,2),        -- null ise genel oran kullanılır
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------- ayarlar
create table if not exists public.settings (
  id                          smallint primary key default 1 check (id = 1),
  default_commission_rate     numeric(5,2) not null default 20,  -- genel komisyon %
  driver_share_percent        numeric(5,2) not null default 50,  -- komisyonun şoföre giden %
  auto_available_on_complete  boolean not null default true,     -- iş bitince otomatik yeşil
  auto_assign                 boolean not null default false,    -- sistem otomatik ortacı atasın
  currency                    text not null default 'TRY',
  updated_at                  timestamptz not null default now()
);
insert into public.settings(id) values (1) on conflict (id) do nothing;

-- -------------------------------------------------------------------- tur
create table if not exists public.trips (
  id                uuid primary key default extensions.gen_random_uuid(),
  code              bigint generated always as identity,   -- kısa tur no
  driver_id         uuid not null references public.profiles(id),
  ortaci_id         uuid references public.profiles(id),
  eta_minutes       integer not null check (eta_minutes between 1 and 240),
  customer_count    integer not null default 1 check (customer_count between 1 and 60),
  note              text,
  status            trip_status not null default 'bekliyor',
  total_amount      numeric(12,2) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  driver_share      numeric(12,2) not null default 0,
  admin_share       numeric(12,2) not null default 0,
  created_at        timestamptz not null default now(),
  assigned_at       timestamptz,
  picked_up_at      timestamptz,
  completed_at      timestamptz
);
create index if not exists trips_status_idx    on public.trips(status);
create index if not exists trips_driver_idx    on public.trips(driver_id, created_at desc);
create index if not exists trips_ortaci_idx    on public.trips(ortaci_id, created_at desc);
create index if not exists trips_created_idx   on public.trips(created_at desc);

-- ---------------------------------------------------------------- satışlar
create table if not exists public.sales (
  id                uuid primary key default extensions.gen_random_uuid(),
  trip_id           uuid not null references public.trips(id) on delete cascade,
  shop_id           uuid references public.shops(id),
  shop_name         text not null,                       -- anlık kopya
  amount            numeric(12,2) not null check (amount > 0),
  commission_rate   numeric(5,2)  not null,
  commission_amount numeric(12,2) not null,
  note              text,
  created_by        uuid not null references public.profiles(id),
  created_at        timestamptz not null default now()
);
create index if not exists sales_trip_idx on public.sales(trip_id, created_at);

-- ------------------------------------------------------------- bildirimler
create table if not exists public.notifications (
  id         uuid primary key default extensions.gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,           -- yeni_tur | atandi | alindi | satis | tamamlandi | iptal
  title      text not null,
  body       text not null,
  trip_id    uuid references public.trips(id) on delete cascade,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
