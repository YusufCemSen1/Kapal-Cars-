# Ortacı+

Kapalıçarşı operasyonu için **şoför – ortacı – yönetici** mobil uygulaması.
Expo (React Native) ile yazıldı; **iOS ve Android'de native uygulama** olarak derlenir,
aynı kod tabanı tarayıcıda da çalışır. Veriler Supabase (Postgres) üzerinde tutulur ve
tüm cihazlara **gerçek zamanlı** akar.

---

## İşleyiş

| Adım | Kim | Ne olur |
|------|-----|---------|
| 1 | Şoför | "5 / 10 / 15 / 20 dakika" düğmesiyle kaç müşterinin geleceğini bildirir |
| 2 | Sistem | Bildirim anında **tüm ortacılara ve yöneticiye** düşer |
| 3 | Ortacı | Turu üstlenir (ya da ayar açıksa sistem müsait ortacıya otomatik atar) |
| 4 | Ortacı | "Müşteriyi teslim aldım" → yöneticiye ve şoföre bilgi gider |
| 5 | Ortacı | Her mağaza alışverişini tutarıyla girer → yönetici ve şoför anında görür |
| 6 | Ortacı | "Alışverişi tamamla" → tur kapanır, toplam tutar yöneticiye ve şoföre iletilir |
| 7 | Sistem | Komisyonu mağaza oranına göre hesaplar, şoför payı / yönetim payı olarak ayırır |

Ortacının müsaitlik ışığı taksilerdeki gibi çalışır: **yeşil = müsait**, **kırmızı = meşgul**.
Tur üstlenilince kendiliğinden kırmızıya döner; tur bitince (ayara göre) yeşile döner.
Ortacı işi olmasa da kendini kırmızıya alabilir.

## Kim neyi görür

* **Şoför** — kendi turları, müşterilerin teslim alındığı bilgisi, toplam alışveriş tutarı.
  Ortacı ve yönetici bilgisi *hiç gelmez*.
* **Ortacı** — gelen müşteriler, alışveriş girişi, turu tamamlama.
  Şoför ve yönetici bilgisi *hiç gelmez*. Komisyon oranlarını da görmez.
* **Yönetici** — her şey: canlı durum, tüm turlar, kişi/mağaza raporları, komisyon dağılımı,
  kullanıcı ve mağaza yönetimi, oran ayarları.

Bu ayrım yalnızca arayüzde değil **veritabanı seviyesinde** uygulanır: şoför ve ortacı
hiçbir tabloyu doğrudan okuyamaz, yalnızca kendilerine açılmış RPC uçlarını çağırır
(`supabase/03_rls.sql`).

## Giriş

Herkes yöneticinin verdiği **kullanıcı adı + kişisel şifre** ile girer.
Hesapları yalnızca yönetici oluşturur (Kullanıcılar sekmesi). Kullanıcı adı 3-24 karakter,
küçük harf/rakam/nokta/alt çizgi olabilir. Şifre üretildiğinde bir kez gösterilir; sonra
yalnızca yenilenebilir.

---

## Kurulum

### 1. Supabase projesi

1. [supabase.com](https://supabase.com) üzerinde yeni proje açın.
2. **SQL Editor**'de sırayla çalıştırın:
   `supabase/01_schema.sql` → `02_functions.sql` → `03_rls.sql`
3. **Authentication → Users → Add user** ile bir kullanıcı oluşturun
   (örn. `admin@kapalicarsi.local`, güçlü bir şifre, *Auto Confirm* açık).
4. `supabase/04_seed.sql` dosyasının başındaki üç değeri doldurup çalıştırın.
   Bu, ilk yöneticiyi ve örnek mağazaları oluşturur.

### 2. Edge Function'lar

```bash
npm i -g supabase
supabase login
supabase link --project-ref <proje-ref>
supabase functions deploy login --no-verify-jwt
supabase functions deploy admin-users
```

`login` fonksiyonu giriş yapılmadan çağrıldığı için `--no-verify-jwt` ile yayınlanır;
kendi içinde şifreyi doğrular. `admin-users` çağıranın yönetici olduğunu denetler.

### 3. Uygulama

```bash
cp .env.example .env
```

`.env` içine Supabase panelindeki **Project Settings → API** değerlerini yazın:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Sonra:

```bash
npm install
npx expo run:ios       # iOS simülatörü / cihaz
npx expo run:android   # Android emülatörü / cihaz
npx expo start --web   # tarayıcı
```

### 4. Mağazaya çıkarma

```bash
npm i -g eas-cli
eas login
eas build --platform ios
eas build --platform android
```

---

## Proje yapısı

```
src/
  app/                 ekranlar (expo-router)
    giris.tsx          kullanıcı adı + kişisel şifre ile giriş
    (sofor)/           müşteri bildir · turlarım
    (ortaci)/          müsaitlik · alışveriş girişi · geçmiş
    (admin)/           canlı durum · turlar · rapor · kullanıcılar · ayarlar
    bildirimler.tsx    bildirim akışı
  components/          ortak arayüz parçaları
  lib/                 supabase istemcisi, oturum, canlı bildirim, biçimlendirme
supabase/
  01_schema.sql        tablolar
  02_functions.sql     iş kuralları, tetikleyiciler, rol bazlı RPC uçları
  03_rls.sql           satır bazlı güvenlik + realtime
  04_seed.sql          ilk yönetici + örnek mağazalar
  functions/           login · admin-users (Edge Functions)
```

## Ayarlar (Yönetici → Ayarlar)

* **Genel komisyon oranı** — kendi oranı girilmemiş mağazalarda kullanılır.
* **Şoför payı %** — komisyonun şoföre giden kısmı; kalanı yönetimde kalır.
* **İş bitince otomatik müsait** — ortacı turu kapatınca ışığı yeşile döner.
* **Otomatik ortacı ataması** — açıkken sistem, en uzun süredir iş almamış müsait
  ortacıya turu kendisi atar; kapalıyken ortacılar turu elle üstlenir.

Mağaza bazlı komisyon oranları **Ayarlar → Mağazalar** ekranından tanımlanır.
