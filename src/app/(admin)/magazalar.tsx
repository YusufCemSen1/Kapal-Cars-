import { useCallback, useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { Ekran } from "@/components/Ekran";
import { Alan, Bos, Dugme, Kart, Rozet, Uyari } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { bosluk, renk } from "@/lib/theme";

type Magaza = {
  id: string;
  name: string;
  commission_rate: string | null;
  is_active: boolean;
};

export default function AdminMagazalar() {
  const [liste, setListe] = useState<Magaza[]>([]);
  const [genelOran, setGenelOran] = useState<string>("0");
  const [ad, setAd] = useState("");
  const [oran, setOran] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [islemde, setIslemde] = useState(false);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    const [m, s] = await Promise.all([
      supabase.from("shops").select("id,name,commission_rate,is_active").order("name"),
      supabase.from("settings").select("default_commission_rate").eq("id", 1).single(),
    ]);
    setListe((m.data as Magaza[]) ?? []);
    setGenelOran(String(s.data?.default_commission_rate ?? 0));
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function calistir(is: () => Promise<unknown>) {
    if (islemde) return;
    setHata(null);
    setIslemde(true);
    try {
      await is();
      await yukle();
    } catch (e) {
      setHata((e as Error).message);
    } finally {
      setIslemde(false);
    }
  }

  async function ekle() {
    await calistir(async () => {
      const temizOran = oran.trim().replace(",", ".");
      const { error } = await supabase.from("shops").insert({
        name: ad.trim(),
        commission_rate: temizOran ? Number(temizOran) : null,
      });
      if (error) {
        throw new Error(
          error.code === "23505" ? "Bu isimde bir mağaza zaten var." : error.message,
        );
      }
      setAd("");
      setOran("");
    });
  }

  function sil(m: Magaza) {
    const calistirSil = () =>
      void calistir(async () => {
        const { error } = await supabase.from("shops").delete().eq("id", m.id);
        if (error) {
          // Geçmiş satışlar mağazaya bağlıysa silmek yerine pasife al
          await supabase.from("shops").update({ is_active: false }).eq("id", m.id);
        }
      });

    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (window.confirm(`${m.name} silinsin mi?`)) calistirSil();
      return;
    }
    Alert.alert("Mağazayı sil", `${m.name} silinsin mi?`, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: calistirSil },
    ]);
  }

  return (
    <Ekran
      yenileniyor={yenileniyor}
      onYenile={async () => {
        setYenileniyor(true);
        await yukle();
        setYenileniyor(false);
      }}
    >
      <Uyari
        tur="bilgi"
        metin={`Oran girilmeyen mağazalar için genel komisyon oranı (%${genelOran}) uygulanır.`}
      />

      <Kart style={{ gap: bosluk.md }}>
        <Text style={st.kartBaslik}>Mağaza ekle</Text>
        <Alan etiket="Mağaza adı" value={ad} onChangeText={setAd} placeholder="Örn. Şark Halı" />
        <Alan
          etiket="Komisyon oranı % (boşsa genel oran)"
          value={oran}
          onChangeText={setOran}
          keyboardType="decimal-pad"
          placeholder={genelOran}
        />
        {hata ? <Uyari metin={hata} /> : null}
        <Dugme
          baslik="Ekle"
          ikon="add-circle"
          tam
          yukleniyor={islemde}
          pasif={ad.trim().length < 2}
          onPress={ekle}
        />
      </Kart>

      {liste.length === 0 ? (
        <Bos ikon="storefront-outline" baslik="Mağaza yok" />
      ) : (
        liste.map((m) => (
          <Kart key={m.id} style={{ gap: bosluk.sm, opacity: m.is_active ? 1 : 0.55 }}>
            <View style={st.ust}>
              <View style={{ flex: 1 }}>
                <Text style={st.ad}>{m.name}</Text>
                <Text style={st.alt}>
                  Komisyon %
                  {m.commission_rate !== null
                    ? Number(m.commission_rate)
                    : `${genelOran} (genel)`}
                </Text>
              </View>
              {!m.is_active ? (
                <Rozet metin="Kapalı" bg={renk.kirmiziAcik} fg={renk.kirmizi} />
              ) : null}
            </View>
            <View style={st.aksiyonlar}>
              <Dugme
                baslik={m.is_active ? "Kapat" : "Aç"}
                tur="ikincil"
                kucuk
                ikon={m.is_active ? "pause-outline" : "play-outline"}
                pasif={islemde}
                onPress={() =>
                  calistir(async () => {
                    await supabase
                      .from("shops")
                      .update({ is_active: !m.is_active })
                      .eq("id", m.id);
                  })
                }
              />
              <Dugme
                baslik="Sil"
                tur="sade"
                kucuk
                ikon="trash-outline"
                pasif={islemde}
                onPress={() => sil(m)}
              />
            </View>
          </Kart>
        ))
      )}
    </Ekran>
  );
}

const st = StyleSheet.create({
  kartBaslik: { fontSize: 15, fontWeight: "800", color: renk.metin },
  ust: { flexDirection: "row", alignItems: "center", gap: bosluk.md },
  ad: { fontSize: 15.5, fontWeight: "800", color: renk.metin },
  alt: { fontSize: 12, color: renk.soluk, marginTop: 2 },
  aksiyonlar: { flexDirection: "row", gap: bosluk.sm },
});
