-- =====================================================================
--  04 — İlk yönetici + örnek mağazalar
--  Yönetici hesabı burada otomatik oluşturulur; panelde elle kullanıcı
--  eklemeye gerek yoktur.
--
--    Kullanıcı adı : admin
--    Şifre         : 123456      <-- İLK GİRİŞTEN SONRA MUTLAKA DEĞİŞTİRİN
-- =====================================================================

do $$
declare
  v_user     text := 'admin';
  v_code     text := '123456';
  v_name     text := 'Yönetici';
  v_email    text := 'admin@ortaciplus.local';
  v_password text := encode(extensions.gen_random_bytes(24), 'hex');
  v_uid      uuid;
begin
  -- Zaten varsa tekrar oluşturma
  select id into v_uid from auth.users where email = v_email;

  if v_uid is null then
    v_uid := extensions.gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false
    );

    -- Parola ile girişin çalışması için kimlik kaydı şart
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) values (
      extensions.gen_random_uuid(), v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', v_email),
      'email', v_email, now(), now(), now()
    );
  else
    -- Var olan hesabın parolasını bilmediğimiz için yenisiyle değiştir
    update auth.users
       set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf'))
     where id = v_uid;
  end if;

  insert into public.profiles(id, username, full_name, role)
  values (v_uid, lower(v_user), v_name, 'admin')
  on conflict (id) do update
    set username = excluded.username, full_name = excluded.full_name, role = 'admin';

  perform public.upsert_user_secret(v_uid, v_code, v_email, v_password);

  raise notice 'Yönetici hazır — kullanıcı adı: %  şifre: %', v_user, v_code;
end $$;

-- ------------------------------------------------------- örnek mağazalar
insert into public.shops(name, commission_rate) values
  ('Halı — Örnek Mağaza',     30),
  ('Deri — Örnek Mağaza',     25),
  ('Kuyumcu — Örnek Mağaza',  20),
  ('Tekstil — Örnek Mağaza',  25),
  ('Seramik — Örnek Mağaza',  30)
on conflict (name) do nothing;

update public.settings set
  default_commission_rate    = 20,
  driver_share_percent       = 50,
  auto_available_on_complete = true,
  auto_assign                = false
where id = 1;
