-- =====================================================================
--  04_seed.sql : ilk yönetici + örnek mağazalar
--
--  ADIM 1 — Supabase panelinde: Authentication > Users > "Add user"
--           E-posta : admin@kapalicarsi.local
--           Şifre   : uzun ve rastgele bir şey (bunu kimse ezberlemeyecek)
--           "Auto Confirm User" işaretli olsun.
--  ADIM 2 — Aşağıdaki üç değeri doldurup bu dosyayı çalıştırın.
-- =====================================================================

do $$
declare
  v_email    text := 'admin@kapalicarsi.local';  -- ADIM 1'de girdiğiniz e-posta
  v_password text := 'BURAYA_ADIM1_SIFRESI';     -- ADIM 1'de girdiğiniz şifre
  v_user     text := 'admin';                    -- uygulamaya girerken yazılacak KULLANICI ADI
  v_code     text := '123456';                   -- uygulamaya girerken yazılacak KİŞİSEL ŞİFRE
  v_name     text := 'Yönetici';
  v_uid      uuid;
begin
  select id into v_uid from auth.users where email = v_email;
  if v_uid is null then
    raise exception 'Önce Supabase panelinden % e-postalı kullanıcıyı oluşturun.', v_email;
  end if;

  insert into public.profiles(id, username, full_name, role)
  values (v_uid, lower(v_user), v_name, 'admin')
  on conflict (id) do update
    set username = excluded.username, full_name = excluded.full_name, role = 'admin';

  perform public.upsert_user_secret(v_uid, v_code, v_email, v_password);
  raise notice 'Yönetici hazır. Kullanıcı adı: % / şifre: %', v_user, v_code;
end $$;

-- ------------------------------------------------------- örnek mağazalar
insert into public.shops(name, commission_rate) values
  ('Halı — Örnek Mağaza',     30),
  ('Deri — Örnek Mağaza',     25),
  ('Kuyumcu — Örnek Mağaza',  20),
  ('Tekstil — Örnek Mağaza',  25),
  ('Seramik — Örnek Mağaza',  30)
on conflict (name) do nothing;

-- Genel ayarlar
update public.settings set
  default_commission_rate    = 20,
  driver_share_percent       = 50,
  auto_available_on_complete = true,
  auto_assign                = false
where id = 1;
