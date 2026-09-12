-- =====================================================================
--  02_functions.sql : yardımcı fonksiyonlar, bildirim tetikleyicileri,
--                     rol bazlı RPC uçları
-- =====================================================================

-- ------------------------------------------------------- yardımcılar
create or replace function public.my_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active)
$$;

create or replace function public.require_role(p_role user_role)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from public.profiles
   where id = auth.uid() and role = p_role and is_active;
  if v_id is null then
    raise exception 'Bu işlem için yetkiniz yok (% rolü gerekli).', p_role
      using errcode = '42501';
  end if;
  return v_id;
end $$;

-- Oturum sahibinin kendi profili
create or replace function public.me()
returns table (id uuid, username text, full_name text, role user_role, phone text,
               is_active boolean, is_available boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.full_name, p.role, p.phone, p.is_active, p.is_available
    from public.profiles p where p.id = auth.uid()
$$;

-- Bildirim yazıcı
create or replace function public.push_note(
  p_user uuid, p_type text, p_title text, p_body text, p_trip uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id, type, title, body, trip_id)
  values (p_user, p_type, p_title, p_body, p_trip)
$$;

create or replace function public.money(p_amount numeric)
returns text language sql immutable as $$
  select trim(to_char(p_amount, 'FM999G999G999G990D00')) || ' TL'
$$;

-- ============================================================ TETİKLEYİCİLER

-- Yeni tur bildirildiğinde: tüm aktif ortacılara + adminlere haber
create or replace function public.trg_trip_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_driver text;
  r record;
begin
  select full_name into v_driver from public.profiles where id = new.driver_id;

  for r in select id from public.profiles where role = 'ortaci' and is_active loop
    perform public.push_note(r.id, 'yeni_tur', 'Müşteri geliyor',
      new.eta_minutes || ' dakika içinde ' || new.customer_count || ' müşteri gelecek.'
      || coalesce(' Not: ' || new.note, ''), new.id);
  end loop;

  for r in select id from public.profiles where role = 'admin' and is_active loop
    perform public.push_note(r.id, 'yeni_tur', 'Yeni müşteri bildirimi',
      v_driver || ' — ' || new.eta_minutes || ' dk / ' || new.customer_count || ' kişi.', new.id);
  end loop;

  return new;
end $$;

drop trigger if exists trips_after_insert on public.trips;
create trigger trips_after_insert after insert on public.trips
for each row execute function public.trg_trip_created();

-- Durum değişimlerinde bildirim
create or replace function public.trg_trip_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ortaci text; v_driver text; r record;
begin
  if new.status = old.status then return new; end if;

  select full_name into v_ortaci from public.profiles where id = new.ortaci_id;
  select full_name into v_driver from public.profiles where id = new.driver_id;

  if new.status = 'atandi' then
    for r in select id from public.profiles where role = 'admin' and is_active loop
      perform public.push_note(r.id, 'atandi', 'Tur üstlenildi',
        '#' || new.code || ' — ' || coalesce(v_ortaci,'?') || ' turu üstlendi.', new.id);
    end loop;
    if new.ortaci_id is not null then
      perform public.push_note(new.ortaci_id, 'atandi', 'Müşteri sana atandı',
        new.eta_minutes || ' dk içinde ' || new.customer_count || ' müşteri.', new.id);
    end if;

  elsif new.status = 'alindi' then
    for r in select id from public.profiles where role = 'admin' and is_active loop
      perform public.push_note(r.id, 'alindi', 'Müşteri teslim alındı',
        '#' || new.code || ' — ' || coalesce(v_ortaci,'?') || ' müşteriyi aldı ('
        || new.customer_count || ' kişi).', new.id);
    end loop;
    perform public.push_note(new.driver_id, 'alindi', 'Müşteriler teslim edildi',
      new.customer_count || ' müşteri teslim alındı.', new.id);

  elsif new.status = 'tamamlandi' then
    for r in select id from public.profiles where role = 'admin' and is_active loop
      perform public.push_note(r.id, 'tamamlandi', 'Alışveriş tamamlandı',
        '#' || new.code || ' — ' || coalesce(v_ortaci,'?') || ' · Toplam '
        || public.money(new.total_amount) || ' · Komisyon '
        || public.money(new.commission_amount), new.id);
    end loop;
    perform public.push_note(new.driver_id, 'tamamlandi', 'Müşterilerin işi bitti',
      'Toplam alışveriş: ' || public.money(new.total_amount), new.id);

  elsif new.status = 'iptal' then
    for r in select id from public.profiles where role = 'admin' and is_active loop
      perform public.push_note(r.id, 'iptal', 'Tur iptal edildi', '#' || new.code, new.id);
    end loop;
    perform public.push_note(new.driver_id, 'iptal', 'Tur iptal edildi', '#' || new.code, new.id);
    if new.ortaci_id is not null then
      perform public.push_note(new.ortaci_id, 'iptal', 'Tur iptal edildi', '#' || new.code, new.id);
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trips_after_status on public.trips;
create trigger trips_after_status after update of status on public.trips
for each row execute function public.trg_trip_status();

-- Satış girildiğinde tur toplamlarını güncelle + admin & şoföre haber
create or replace function public.recalc_trip(p_trip uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_total numeric(12,2); v_comm numeric(12,2); v_share numeric(5,2);
begin
  select coalesce(sum(amount),0), coalesce(sum(commission_amount),0)
    into v_total, v_comm from public.sales where trip_id = p_trip;
  select driver_share_percent into v_share from public.settings where id = 1;

  update public.trips set
    total_amount      = v_total,
    commission_amount = v_comm,
    driver_share      = round(v_comm * v_share / 100, 2),
    admin_share       = v_comm - round(v_comm * v_share / 100, 2)
  where id = p_trip;
end $$;

create or replace function public.trg_sale_changed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_trip public.trips%rowtype; v_ortaci text; r record; v_trip_id uuid;
begin
  if tg_op = 'DELETE' then
    v_trip_id := old.trip_id;
  else
    v_trip_id := new.trip_id;
  end if;

  perform public.recalc_trip(v_trip_id);
  select * into v_trip from public.trips where id = v_trip_id;

  if tg_op = 'INSERT' then
    select full_name into v_ortaci from public.profiles where id = v_trip.ortaci_id;
    for r in select id from public.profiles where role = 'admin' and is_active loop
      perform public.push_note(r.id, 'satis', 'Yeni alışveriş',
        '#' || v_trip.code || ' · ' || new.shop_name || ' · ' || public.money(new.amount)
        || ' · komisyon ' || public.money(new.commission_amount)
        || ' (' || coalesce(v_ortaci,'?') || ')', v_trip.id);
    end loop;
    perform public.push_note(v_trip.driver_id, 'satis', 'Yeni alışveriş',
      new.shop_name || ' · ' || public.money(new.amount)
      || ' — tur toplamı ' || public.money(v_trip.total_amount), v_trip.id);
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists sales_after_change on public.sales;
create trigger sales_after_change after insert or update or delete on public.sales
for each row execute function public.trg_sale_changed();

-- ================================================================ ŞOFÖR

-- Şoför "müşteri geliyor" bildirir. Ayarda otomatik atama açıksa
-- müsait ortacılardan en uzun süredir iş almayana atanır.
create or replace function public.sofor_tur_bildir(
  p_eta integer, p_customer_count integer default 1, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_driver uuid; v_trip uuid; v_auto boolean; v_ortaci uuid;
begin
  v_driver := public.require_role('sofor');

  insert into public.trips(driver_id, eta_minutes, customer_count, note)
  values (v_driver, p_eta, greatest(coalesce(p_customer_count,1),1), nullif(trim(coalesce(p_note,'')),''))
  returning id into v_trip;

  select auto_assign into v_auto from public.settings where id = 1;
  if v_auto then
    select id into v_ortaci from public.profiles
     where role = 'ortaci' and is_active and is_available
     order by last_assigned_at nulls first, created_at
     limit 1;
    if v_ortaci is not null then
      update public.trips set ortaci_id = v_ortaci, status = 'atandi', assigned_at = now()
       where id = v_trip;
      update public.profiles set is_available = false, last_assigned_at = now()
       where id = v_ortaci;
    end if;
  end if;

  return v_trip;
end $$;

-- Şoförün gördüğü tek şey: kendi turları, durumu ve toplam tutar.
-- Ortacı ya da admin bilgisi bu sonuçta yoktur.
create or replace function public.sofor_turlarim(p_limit integer default 50)
returns table (id uuid, code bigint, eta_minutes integer, customer_count integer,
               note text, status trip_status, total_amount numeric,
               created_at timestamptz, picked_up_at timestamptz, completed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, t.code, t.eta_minutes, t.customer_count, t.note, t.status,
         t.total_amount, t.created_at, t.picked_up_at, t.completed_at
    from public.trips t
   where t.driver_id = public.require_role('sofor')
   order by t.created_at desc
   limit greatest(coalesce(p_limit,50),1)
$$;

create or replace function public.sofor_ozet()
returns table (bugun_tur integer, bugun_tutar numeric, aktif_tur integer,
               toplam_tur integer, toplam_tutar numeric)
language sql stable security definer set search_path = public as $$
  with t as (select * from public.trips where driver_id = public.require_role('sofor'))
  select
    (select count(*)::int  from t where created_at >= date_trunc('day', now()) and status <> 'iptal'),
    (select coalesce(sum(total_amount),0) from t where created_at >= date_trunc('day', now())),
    (select count(*)::int  from t where status in ('bekliyor','atandi','alindi')),
    (select count(*)::int  from t where status <> 'iptal'),
    (select coalesce(sum(total_amount),0) from t where status = 'tamamlandi')
$$;

-- ================================================================ ORTACI

create or replace function public.ortaci_musaitlik(p_available boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_busy int;
begin
  v_id := public.require_role('ortaci');
  if p_available then
    select count(*) into v_busy from public.trips
     where ortaci_id = v_id and status in ('atandi','alindi');
    if v_busy > 0 then
      raise exception 'Devam eden turunuz varken müsait olamazsınız.' using errcode = 'P0001';
    end if;
  end if;
  update public.profiles set is_available = p_available where id = v_id;
  return p_available;
end $$;

-- Henüz kimsenin üstlenmediği turlar (şoför kimliği gösterilmez)
create or replace function public.ortaci_bekleyenler()
returns table (id uuid, code bigint, eta_minutes integer, customer_count integer,
               note text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, t.code, t.eta_minutes, t.customer_count, t.note, t.created_at
    from public.trips t
   where t.status = 'bekliyor'
     and public.require_role('ortaci') is not null
   order by t.created_at
$$;

create or replace function public.ortaci_tur_al(p_trip uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ok int;
begin
  v_id := public.require_role('ortaci');
  update public.trips
     set ortaci_id = v_id, status = 'atandi', assigned_at = now()
   where id = p_trip and status = 'bekliyor';
  get diagnostics v_ok = row_count;
  if v_ok = 0 then
    raise exception 'Bu turu başka bir ortacı üstlenmiş.' using errcode = 'P0001';
  end if;
  update public.profiles set is_available = false, last_assigned_at = now() where id = v_id;
  return p_trip;
end $$;

create or replace function public.ortaci_musteri_alindi(p_trip uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ok int;
begin
  v_id := public.require_role('ortaci');
  update public.trips set status = 'alindi', picked_up_at = now()
   where id = p_trip and ortaci_id = v_id and status = 'atandi';
  get diagnostics v_ok = row_count;
  if v_ok = 0 then raise exception 'Tur bulunamadı ya da durumu uygun değil.' using errcode='P0001'; end if;
  return p_trip;
end $$;

-- Ortacı her alışverişi rakamsal olarak girer
create or replace function public.ortaci_satis_ekle(
  p_trip uuid, p_shop uuid, p_amount numeric, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_status trip_status; v_name text; v_rate numeric(5,2); v_sale uuid;
begin
  v_id := public.require_role('ortaci');

  select status into v_status from public.trips where id = p_trip and ortaci_id = v_id;
  if v_status is null then raise exception 'Tur size ait değil.' using errcode='P0001'; end if;
  if v_status not in ('atandi','alindi') then
    raise exception 'Bu tura artık alışveriş eklenemez.' using errcode='P0001';
  end if;
  if coalesce(p_amount,0) <= 0 then
    raise exception 'Tutar sıfırdan büyük olmalı.' using errcode='P0001';
  end if;

  select s.name, coalesce(s.commission_rate, st.default_commission_rate)
    into v_name, v_rate
    from public.shops s cross join public.settings st
   where s.id = p_shop and s.is_active and st.id = 1;
  if v_name is null then raise exception 'Mağaza bulunamadı.' using errcode='P0001'; end if;

  insert into public.sales(trip_id, shop_id, shop_name, amount,
                           commission_rate, commission_amount, note, created_by)
  values (p_trip, p_shop, v_name, p_amount, v_rate,
          round(p_amount * v_rate / 100, 2), nullif(trim(coalesce(p_note,'')),''), v_id)
  returning id into v_sale;

  -- müşteri alınmadan satış girildiyse turu otomatik "alindi" yap
  if v_status = 'atandi' then
    update public.trips set status = 'alindi', picked_up_at = now() where id = p_trip;
  end if;

  return v_sale;
end $$;

create or replace function public.ortaci_satis_sil(p_sale uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ok int;
begin
  v_id := public.require_role('ortaci');
  delete from public.sales s using public.trips t
   where s.id = p_sale and s.trip_id = t.id
     and t.ortaci_id = v_id and t.status in ('atandi','alindi');
  get diagnostics v_ok = row_count;
  if v_ok = 0 then raise exception 'Kayıt silinemedi.' using errcode='P0001'; end if;
end $$;

-- Ortacı bir turdaki alışverişleri (kendi turu) görür
create or replace function public.ortaci_satislar(p_trip uuid)
returns table (id uuid, shop_name text, amount numeric, note text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.shop_name, s.amount, s.note, s.created_at
    from public.sales s join public.trips t on t.id = s.trip_id
   where s.trip_id = p_trip and t.ortaci_id = public.require_role('ortaci')
   order by s.created_at
$$;

create or replace function public.ortaci_tur_tamamla(p_trip uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ok int; v_total numeric; v_auto boolean;
begin
  v_id := public.require_role('ortaci');
  perform public.recalc_trip(p_trip);

  update public.trips set status = 'tamamlandi', completed_at = now()
   where id = p_trip and ortaci_id = v_id and status in ('atandi','alindi')
  returning total_amount into v_total;
  get diagnostics v_ok = row_count;
  if v_ok = 0 then raise exception 'Tur tamamlanamadı.' using errcode='P0001'; end if;

  select auto_available_on_complete into v_auto from public.settings where id = 1;
  update public.profiles set is_available = coalesce(v_auto, true) where id = v_id;

  return v_total;
end $$;

-- Ortacının turları (şoför/admin bilgisi yok)
create or replace function public.ortaci_turlarim(p_limit integer default 50)
returns table (id uuid, code bigint, eta_minutes integer, customer_count integer,
               note text, status trip_status, total_amount numeric,
               created_at timestamptz, completed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, t.code, t.eta_minutes, t.customer_count, t.note, t.status,
         t.total_amount, t.created_at, t.completed_at
    from public.trips t
   where t.ortaci_id = public.require_role('ortaci')
   order by t.created_at desc
   limit greatest(coalesce(p_limit,50),1)
$$;

create or replace function public.ortaci_ozet()
returns table (bugun_tur integer, bugun_tutar numeric, toplam_tur integer, toplam_tutar numeric)
language sql stable security definer set search_path = public as $$
  with t as (select * from public.trips where ortaci_id = public.require_role('ortaci'))
  select
    (select count(*)::int from t where created_at >= date_trunc('day', now()) and status <> 'iptal'),
    (select coalesce(sum(total_amount),0) from t where created_at >= date_trunc('day', now())),
    (select count(*)::int from t where status <> 'iptal'),
    (select coalesce(sum(total_amount),0) from t where status = 'tamamlandi')
$$;

-- Ortacının mağaza listesi (komisyon oranı gösterilmez)
create or replace function public.ortaci_magazalar()
returns table (id uuid, name text)
language sql stable security definer set search_path = public as $$
  select s.id, s.name from public.shops s
   where s.is_active and public.require_role('ortaci') is not null
   order by s.name
$$;

-- ================================================================= ADMIN

create or replace function public.admin_tur_ata(p_trip uuid, p_ortaci uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkiniz yok.' using errcode='42501'; end if;
  update public.trips set ortaci_id = p_ortaci, status = 'atandi', assigned_at = now()
   where id = p_trip and status in ('bekliyor','atandi');
  update public.profiles set is_available = false, last_assigned_at = now() where id = p_ortaci;
end $$;

create or replace function public.admin_tur_iptal(p_trip uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_ortaci uuid; v_auto boolean;
begin
  if not public.is_admin() then raise exception 'Yetkiniz yok.' using errcode='42501'; end if;
  update public.trips set status = 'iptal' where id = p_trip and status <> 'tamamlandi'
  returning ortaci_id into v_ortaci;
  select auto_available_on_complete into v_auto from public.settings where id = 1;
  if v_ortaci is not null then
    update public.profiles set is_available = coalesce(v_auto,true) where id = v_ortaci;
  end if;
end $$;

-- Admin özeti: ciro, komisyon, şoför payı, admin payı
create or replace function public.admin_ozet(
  p_from timestamptz default date_trunc('day', now()),
  p_to   timestamptz default now() + interval '1 day')
returns table (tur_sayisi integer, musteri_sayisi integer, toplam_ciro numeric,
               toplam_komisyon numeric, sofor_payi numeric, admin_payi numeric,
               bekleyen integer, devam_eden integer, musait_ortaci integer)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from public.trips
      where created_at >= p_from and created_at < p_to and status = 'tamamlandi'),
    (select coalesce(sum(customer_count),0)::int from public.trips
      where created_at >= p_from and created_at < p_to and status = 'tamamlandi'),
    (select coalesce(sum(total_amount),0) from public.trips
      where created_at >= p_from and created_at < p_to and status = 'tamamlandi'),
    (select coalesce(sum(commission_amount),0) from public.trips
      where created_at >= p_from and created_at < p_to and status = 'tamamlandi'),
    (select coalesce(sum(driver_share),0) from public.trips
      where created_at >= p_from and created_at < p_to and status = 'tamamlandi'),
    (select coalesce(sum(admin_share),0) from public.trips
      where created_at >= p_from and created_at < p_to and status = 'tamamlandi'),
    (select count(*)::int from public.trips where status = 'bekliyor'),
    (select count(*)::int from public.trips where status in ('atandi','alindi')),
    (select count(*)::int from public.profiles where role='ortaci' and is_active and is_available)
  where public.is_admin()
$$;

-- Kişi bazlı kırılım (şoför ve ortacı performansı)
create or replace function public.admin_kisi_raporu(
  p_from timestamptz default date_trunc('day', now()),
  p_to   timestamptz default now() + interval '1 day')
returns table (profile_id uuid, full_name text, role user_role,
               tur_sayisi integer, toplam_ciro numeric, toplam_komisyon numeric, pay numeric)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role,
         count(t.id)::int,
         coalesce(sum(t.total_amount),0),
         coalesce(sum(t.commission_amount),0),
         coalesce(sum(case when p.role='sofor' then t.driver_share else 0 end),0)
    from public.profiles p
    left join public.trips t
      on ((p.role='sofor' and t.driver_id = p.id) or (p.role='ortaci' and t.ortaci_id = p.id))
     and t.status = 'tamamlandi' and t.created_at >= p_from and t.created_at < p_to
   where public.is_admin() and p.role in ('sofor','ortaci')
   group by p.id, p.full_name, p.role
   order by 5 desc
$$;

-- Mağaza kırılımı
create or replace function public.admin_magaza_raporu(
  p_from timestamptz default date_trunc('day', now()),
  p_to   timestamptz default now() + interval '1 day')
returns table (shop_name text, satis_adedi integer, toplam numeric, komisyon numeric)
language sql stable security definer set search_path = public as $$
  select s.shop_name, count(*)::int, sum(s.amount), sum(s.commission_amount)
    from public.sales s
   where public.is_admin() and s.created_at >= p_from and s.created_at < p_to
   group by s.shop_name
   order by 3 desc
$$;

-- Adminin canlı tur listesi (her şey görünür)
create or replace function public.admin_turlar(
  p_status trip_status default null, p_limit integer default 100)
returns table (id uuid, code bigint, status trip_status, eta_minutes integer,
               customer_count integer, note text, driver_name text, ortaci_name text,
               total_amount numeric, commission_amount numeric,
               driver_share numeric, admin_share numeric,
               created_at timestamptz, assigned_at timestamptz,
               picked_up_at timestamptz, completed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, t.code, t.status, t.eta_minutes, t.customer_count, t.note,
         d.full_name, o.full_name, t.total_amount, t.commission_amount,
         t.driver_share, t.admin_share,
         t.created_at, t.assigned_at, t.picked_up_at, t.completed_at
    from public.trips t
    join public.profiles d on d.id = t.driver_id
    left join public.profiles o on o.id = t.ortaci_id
   where public.is_admin() and (p_status is null or t.status = p_status)
   order by t.created_at desc
   limit greatest(coalesce(p_limit,100),1)
$$;

create or replace function public.admin_tur_satislar(p_trip uuid)
returns table (id uuid, shop_name text, amount numeric, commission_rate numeric,
               commission_amount numeric, note text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.shop_name, s.amount, s.commission_rate, s.commission_amount, s.note, s.created_at
    from public.sales s
   where public.is_admin() and s.trip_id = p_trip
   order by s.created_at
$$;

-- ==================================================== BİLDİRİM YARDIMCILARI
create or replace function public.bildirimleri_okundu_yap()
returns void language sql security definer set search_path = public as $$
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null
$$;

-- =============================================== GİRİŞ (yalnızca service_role)
-- Kullanıcı adı + kişisel şifreyi doğrular, Supabase Auth kimlik bilgisini döner.
drop function if exists public.login_lookup(text);

create or replace function public.login_lookup(p_username text, p_code text)
returns table (profile_id uuid, auth_email text, auth_password text,
               full_name text, role user_role, is_active boolean)
language sql security definer set search_path = public, extensions as $$
  select p.id, s.auth_email, s.auth_password, p.full_name, p.role, p.is_active
    from public.profiles p
    join public.user_secrets s on s.profile_id = p.id
   where p.username = lower(trim(p_username))
     and s.code_hash = extensions.crypt(p_code, s.code_hash)
$$;
revoke all on function public.login_lookup(text, text) from public, anon, authenticated;
grant execute on function public.login_lookup(text, text) to service_role;

-- Kullanıcı oluşturma/şifre atama (service_role tarafından Edge Function ile çağrılır)
create or replace function public.upsert_user_secret(
  p_profile uuid, p_code text, p_email text default null, p_password text default null)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_email text; v_password text;
begin
  if length(coalesce(p_code,'')) < 4 then
    raise exception 'Şifre en az 4 karakter olmalı.' using errcode='P0001';
  end if;

  select auth_email, auth_password into v_email, v_password
    from public.user_secrets where profile_id = p_profile;

  v_email    := coalesce(p_email, v_email);
  v_password := coalesce(p_password, v_password);
  if v_email is null or v_password is null then
    raise exception 'Kullanıcının kimlik bilgisi eksik.' using errcode='P0001';
  end if;

  insert into public.user_secrets(profile_id, code_hash, auth_email, auth_password)
  values (p_profile, extensions.crypt(p_code, extensions.gen_salt('bf')), v_email, v_password)
  on conflict (profile_id) do update
     set code_hash     = excluded.code_hash,
         auth_email    = excluded.auth_email,
         auth_password = excluded.auth_password,
         updated_at    = now();
end $$;
revoke all on function public.upsert_user_secret(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.upsert_user_secret(uuid, text, text, text) to service_role;
