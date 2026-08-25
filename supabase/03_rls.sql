-- =====================================================================
--  03_rls.sql : satır bazlı güvenlik + yetkiler + realtime
--  Kural: şoför ve ortacı hiçbir tabloyu doğrudan okuyamaz.
--         Sadece kendilerine ait RPC uçlarını çağırırlar.
--         Admin her şeyi doğrudan okur.
-- =====================================================================

alter table public.profiles       enable row level security;
alter table public.user_secrets   enable row level security;
alter table public.app_private    enable row level security;
alter table public.shops          enable row level security;
alter table public.settings       enable row level security;
alter table public.trips          enable row level security;
alter table public.sales          enable row level security;
alter table public.notifications  enable row level security;

-- user_secrets ve app_private: hiçbir policy yok => yalnızca service_role
revoke all on public.user_secrets from anon, authenticated;
revoke all on public.app_private  from anon, authenticated;

-- --------------------------------------------------------------- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Rol / aktiflik alanlarını kullanıcı kendisi değiştiremez
create or replace function public.trg_profile_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() boşsa çağrı service_role'dendir (Edge Function): serbest bırak
  if auth.uid() is not null and not public.is_admin() then
    if new.role <> old.role or new.is_active <> old.is_active
       or new.full_name <> old.full_name then
      raise exception 'Bu alanları yalnızca yönetici değiştirebilir.' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
for each row execute function public.trg_profile_guard();

-- ------------------------------------------------------------------ shops
drop policy if exists shops_admin on public.shops;
create policy shops_admin on public.shops for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------------------- settings
drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ trips
-- Doğrudan erişim sadece admin. Şoför/ortacı RPC kullanır.
drop policy if exists trips_admin on public.trips;
create policy trips_admin on public.trips for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ sales
drop policy if exists sales_admin on public.sales;
create policy sales_admin on public.sales for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------- notifications
drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_own_update on public.notifications;
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ================================================================ REALTIME
-- Realtime yayını RLS'e uyar: herkes yalnız görmeye yetkili olduğu satırı alır.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['notifications','trips','sales','profiles'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t)
    then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

alter table public.notifications replica identity full;
alter table public.trips         replica identity full;
alter table public.profiles      replica identity full;
