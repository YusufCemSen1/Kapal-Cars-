import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ekran } from "@/components/Ekran";
import { Istatistik, Kart, Satir } from "@/components/ui";
import { useCanliYenile } from "@/lib/bildirim";
import { gunBasi, para, yarin } from "@/lib/format";
import { rpc } from "@/lib/supabase";
import { bosluk, renk } from "@/lib/theme";

type Ozet = {
  tur_sayisi: number;
  musteri_sayisi: number;
  toplam_ciro: string;
  toplam_komisyon: string;
  sofor_payi: string;
  admin_payi: string;
};

type KisiSatiri = {
  profile_id: string;
  full_name: string;
  role: "sofor" | "ortaci";
  tur_sayisi: number;
  toplam_ciro: string;
  toplam_komisyon: string;
  pay: string;
};

type MagazaSatiri = {
  shop_name: string;
  satis_adedi: number;
  toplam: string;
  komisyon: string;
};

const ARALIKLAR = [
  { etiket: "Bugün", gun: 0 },
  { etiket: "7 gün", gun: 6 },
  { etiket: "30 gün", gun: 29 },
  { etiket: "90 gün", gun: 89 },
];

export default function AdminRapor() {
  const [gun, setGun] = useState(0);
  const [ozet, setOzet] = useState<Ozet | null>(null);
  const [kisiler, setKisiler] = useState<KisiSatiri[]>([]);
  const [magazalar, setMagazalar] = useState<MagazaSatiri[]>([]);
  const [yenileniyor, setYenileniyor] = useState(false);

  const araliklar = useMemo(
    () => ({ p_from: gunBasi(gun), p_to: yarin() }),
    [gun],
  );

  const yukle = useCallback(async () => {
    const [o, k, m] = await Promise.all([
      rpc<Ozet[]>("admin_ozet", araliklar),
      rpc<KisiSatiri[]>("admin_kisi_raporu", araliklar),
      rpc<MagazaSatiri[]>("admin_magaza_raporu", araliklar),
    ]);
    setOzet(Array.isArray(o) ? o[0] : null);
    setKisiler(k ?? []);
    setMagazalar(m ?? []);
  }, [araliklar]);

  useEffect(() => {
    void yukle();
  }, [yukle]);
  useCanliYenile(yukle);

  const soforler = kisiler.filter((k) => k.role === "sofor" && k.tur_sayisi > 0);
  const ortacilar = kisiler.filter((k) => k.role === "ortaci" && k.tur_sayisi > 0);

  return (
    <Ekran
      yenileniyor={yenileniyor}
      onYenile={async () => {
        setYenileniyor(true);
        await yukle();
        setYenileniyor(false);
      }}
    >
      <View style={st.filtreSatir}>
        {ARALIKLAR.map((a) => {
          const secili = a.gun === gun;
          return (
            <Pressable
              key={a.etiket}
              onPress={() => setGun(a.gun)}
              style={[st.filtre, secili && st.filtreSecili]}
            >
              <Text style={[st.filtreYazi, secili && { color: "#fff" }]}>{a.etiket}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={st.izgara}>
        <Istatistik etiket="Tur" deger={String(ozet?.tur_sayisi ?? 0)} ikon="albums-outline" />
        <Istatistik etiket="Müşteri" deger={String(ozet?.musteri_sayisi ?? 0)} ikon="people-outline" />
        <Istatistik etiket="Ciro" deger={para(ozet?.toplam_ciro)} vurgu={renk.yesil} ikon="cash-outline" />
        <Istatistik etiket="Komisyon" deger={para(ozet?.toplam_komisyon)} vurgu={renk.mavi} ikon="pricetag-outline" />
      </View>

      <Kart style={{ gap: bosluk.xs }}>
        <Text style={st.kartBaslik}>Komisyon paylaşımı</Text>
        <Satir etiket="Toplam komisyon" deger={para(ozet?.toplam_komisyon)} kalin />
        <Satir etiket="Şoförlerin payı" deger={para(ozet?.sofor_payi)} renkli={renk.mavi} />
        <Satir etiket="Yönetimde kalan" deger={para(ozet?.admin_payi)} kalin renkli={renk.mor} />
      </Kart>

      <Text style={st.bolumBaslik}>Şoförler</Text>
      <Kart style={{ gap: bosluk.sm }}>
        {soforler.length === 0 ? (
          <Text style={st.soluk}>Bu aralıkta kayıt yok.</Text>
        ) : (
          soforler.map((k) => (
            <View key={k.profile_id} style={st.kisiSatir}>
              <View style={{ flex: 1 }}>
                <Text style={st.kisiAd}>{k.full_name}</Text>
                <Text style={st.kisiAlt}>
                  {k.tur_sayisi} tur · ciro {para(k.toplam_ciro)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={st.kisiTutar}>{para(k.pay)}</Text>
                <Text style={st.kisiAlt}>pay</Text>
              </View>
            </View>
          ))
        )}
      </Kart>

      <Text style={st.bolumBaslik}>Ortacılar</Text>
      <Kart style={{ gap: bosluk.sm }}>
        {ortacilar.length === 0 ? (
          <Text style={st.soluk}>Bu aralıkta kayıt yok.</Text>
        ) : (
          ortacilar.map((k) => (
            <View key={k.profile_id} style={st.kisiSatir}>
              <View style={{ flex: 1 }}>
                <Text style={st.kisiAd}>{k.full_name}</Text>
                <Text style={st.kisiAlt}>{k.tur_sayisi} tur</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={st.kisiTutar}>{para(k.toplam_ciro)}</Text>
                <Text style={st.kisiAlt}>ciro</Text>
              </View>
            </View>
          ))
        )}
      </Kart>

      <Text style={st.bolumBaslik}>Mağazalar</Text>
      <Kart style={{ gap: bosluk.sm }}>
        {magazalar.length === 0 ? (
          <Text style={st.soluk}>Bu aralıkta satış yok.</Text>
        ) : (
          magazalar.map((m) => (
            <View key={m.shop_name} style={st.kisiSatir}>
              <View style={{ flex: 1 }}>
                <Text style={st.kisiAd}>{m.shop_name}</Text>
                <Text style={st.kisiAlt}>
                  {m.satis_adedi} satış · komisyon {para(m.komisyon)}
                </Text>
              </View>
              <Text style={st.kisiTutar}>{para(m.toplam)}</Text>
            </View>
          ))
        )}
      </Kart>
    </Ekran>
  );
}

const st = StyleSheet.create({
  filtreSatir: { flexDirection: "row", gap: bosluk.xs },
  filtre: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: renk.cizgi,
  },
  filtreSecili: { backgroundColor: renk.lacivert, borderColor: renk.lacivert },
  filtreYazi: { fontSize: 12.5, fontWeight: "700", color: renk.soluk },

  izgara: { flexDirection: "row", flexWrap: "wrap", gap: bosluk.sm },
  kartBaslik: { fontSize: 14.5, fontWeight: "800", color: renk.metin, marginBottom: 2 },
  bolumBaslik: { fontSize: 15, fontWeight: "800", color: renk.metin, marginTop: bosluk.sm },
  soluk: { color: renk.soluk, fontSize: 13.5 },

  kisiSatir: { flexDirection: "row", alignItems: "center", gap: bosluk.md },
  kisiAd: { fontSize: 14.5, fontWeight: "700", color: renk.metin },
  kisiAlt: { fontSize: 11.5, color: renk.soluk },
  kisiTutar: { fontSize: 14.5, fontWeight: "800", color: renk.metin },
});
