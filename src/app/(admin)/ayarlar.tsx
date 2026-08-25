import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Ekran } from "@/components/Ekran";
import { Alan, Dugme, Kart, Satir, Uyari } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { bosluk, renk } from "@/lib/theme";

type Ayar = {
  default_commission_rate: string;
  driver_share_percent: string;
  auto_available_on_complete: boolean;
  auto_assign: boolean;
};

export default function AdminAyarlar() {
  const router = useRouter();
  const { profil, cikisYap } = useAuth();
  const [ayar, setAyar] = useState<Ayar | null>(null);
  const [komisyon, setKomisyon] = useState("");
  const [soforPayi, setSoforPayi] = useState("");
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [islemde, setIslemde] = useState(false);

  const yukle = useCallback(async () => {
    const { data } = await supabase
      .from("settings")
      .select("default_commission_rate,driver_share_percent,auto_available_on_complete,auto_assign")
      .eq("id", 1)
      .single();
    if (data) {
      setAyar(data as Ayar);
      setKomisyon(String(Number(data.default_commission_rate)));
      setSoforPayi(String(Number(data.driver_share_percent)));
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function kaydet(yama: Partial<Record<keyof Ayar, unknown>>) {
    setHata(null);
    setMesaj(null);
    setIslemde(true);
    try {
      const { error } = await supabase
        .from("settings")
        .update({ ...yama, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw new Error(error.message);
      await yukle();
      setMesaj("Ayarlar kaydedildi.");
    } catch (e) {
      setHata((e as Error).message);
    } finally {
      setIslemde(false);
    }
  }

  const oranGecerli = (d: string) => {
    const n = Number(d.replace(",", "."));
    return Number.isFinite(n) && n >= 0 && n <= 100;
  };

  return (
    <Ekran onYenile={yukle}>
      <Kart style={{ gap: bosluk.md }}>
        <Text style={st.kartBaslik}>Komisyon</Text>
        <Alan
          etiket="Genel komisyon oranı %"
          value={komisyon}
          onChangeText={setKomisyon}
          keyboardType="decimal-pad"
          ipucu="Kendi oranı girilmemiş mağazalarda bu oran kullanılır."
        />
        <Alan
          etiket="Komisyonun şoföre giden payı %"
          value={soforPayi}
          onChangeText={setSoforPayi}
          keyboardType="decimal-pad"
          ipucu="Kalan kısım yönetimde kalır. Sonraki turlara uygulanır."
        />
        {mesaj ? <Uyari tur="bilgi" metin={mesaj} /> : null}
        {hata ? <Uyari metin={hata} /> : null}
        <Dugme
          baslik="Kaydet"
          ikon="save-outline"
          tam
          yukleniyor={islemde}
          pasif={!oranGecerli(komisyon) || !oranGecerli(soforPayi)}
          onPress={() =>
            kaydet({
              default_commission_rate: Number(komisyon.replace(",", ".")),
              driver_share_percent: Number(soforPayi.replace(",", ".")),
            })
          }
        />
      </Kart>

      <Kart style={{ gap: bosluk.md }}>
        <Text style={st.kartBaslik}>Çalışma düzeni</Text>

        <View style={st.anahtarSatir}>
          <View style={{ flex: 1 }}>
            <Text style={st.anahtarBaslik}>İş bitince otomatik müsait</Text>
            <Text style={st.anahtarAlt}>
              Ortacı turu kapattığında ışığı kendiliğinden yeşile döner.
            </Text>
          </View>
          <Switch
            value={Boolean(ayar?.auto_available_on_complete)}
            onValueChange={(v) => kaydet({ auto_available_on_complete: v })}
            trackColor={{ true: renk.yesil }}
          />
        </View>

        <View style={st.anahtarSatir}>
          <View style={{ flex: 1 }}>
            <Text style={st.anahtarBaslik}>Otomatik ortacı ataması</Text>
            <Text style={st.anahtarAlt}>
              Şoför bildirdiğinde sistem, en uzun süredir iş almamış müsait ortacıya atar.
              Kapalıyken ortacılar turu kendisi üstlenir.
            </Text>
          </View>
          <Switch
            value={Boolean(ayar?.auto_assign)}
            onValueChange={(v) => kaydet({ auto_assign: v })}
            trackColor={{ true: renk.yesil }}
          />
        </View>
      </Kart>

      <Kart onPress={() => router.push("/(admin)/magazalar")} style={st.baglanti}>
        <Ionicons name="storefront-outline" size={20} color={renk.mavi} />
        <View style={{ flex: 1 }}>
          <Text style={st.baglantiBaslik}>Mağazalar ve oranları</Text>
          <Text style={st.anahtarAlt}>Mağaza ekleyin, mağazaya özel komisyon tanımlayın.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={renk.soluk} />
      </Kart>

      <Kart style={{ gap: bosluk.xs }}>
        <Text style={st.kartBaslik}>Hesap</Text>
        <Satir etiket="Ad" deger={profil?.full_name ?? "—"} />
        <Satir etiket="Kullanıcı adı" deger={profil?.username ?? "—"} />
        <Satir etiket="Görev" deger="Yönetici" />
        <Dugme
          baslik="Çıkış yap"
          tur="kirmizi"
          ikon="log-out-outline"
          tam
          style={{ marginTop: bosluk.sm }}
          onPress={() => void cikisYap()}
        />
      </Kart>
    </Ekran>
  );
}

const st = StyleSheet.create({
  kartBaslik: { fontSize: 15, fontWeight: "800", color: renk.metin },
  anahtarSatir: { flexDirection: "row", alignItems: "center", gap: bosluk.md },
  anahtarBaslik: { fontSize: 14, fontWeight: "700", color: renk.metin },
  anahtarAlt: { fontSize: 12, color: renk.soluk, marginTop: 2, lineHeight: 17 },
  baglanti: { flexDirection: "row", alignItems: "center", gap: bosluk.md },
  baglantiBaslik: { fontSize: 14.5, fontWeight: "800", color: renk.metin },
});
