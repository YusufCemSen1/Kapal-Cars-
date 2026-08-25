import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ekran } from "@/components/Ekran";
import { Bos, Kart, Rozet, Satir } from "@/components/ui";
import { useCanliYenile } from "@/lib/bildirim";
import { para, tarihSaat } from "@/lib/format";
import { rpc } from "@/lib/supabase";
import { bosluk, durumEtiketi, durumRengi, renk, yuvarlak, type DurumAnahtari } from "@/lib/theme";

type Tur = {
  id: string;
  code: number;
  status: DurumAnahtari;
  eta_minutes: number;
  customer_count: number;
  note: string | null;
  driver_name: string;
  ortaci_name: string | null;
  total_amount: string;
  commission_amount: string;
  driver_share: string;
  admin_share: string;
  created_at: string;
  picked_up_at: string | null;
  completed_at: string | null;
};

type Satis = {
  id: string;
  shop_name: string;
  amount: string;
  commission_rate: string;
  commission_amount: string;
  note: string | null;
  created_at: string;
};

const FILTRELER: { anahtar: DurumAnahtari | null; etiket: string }[] = [
  { anahtar: null, etiket: "Hepsi" },
  { anahtar: "bekliyor", etiket: "Bekleyen" },
  { anahtar: "alindi", etiket: "Devam eden" },
  { anahtar: "tamamlandi", etiket: "Tamamlanan" },
  { anahtar: "iptal", etiket: "İptal" },
];

export default function AdminTurlar() {
  const [filtre, setFiltre] = useState<DurumAnahtari | null>(null);
  const [turlar, setTurlar] = useState<Tur[]>([]);
  const [acik, setAcik] = useState<string | null>(null);
  const [satislar, setSatislar] = useState<Record<string, Satis[]>>({});
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    const t = await rpc<Tur[]>("admin_turlar", { p_status: filtre, p_limit: 150 });
    setTurlar(t ?? []);
  }, [filtre]);

  useEffect(() => {
    void yukle();
  }, [yukle]);
  useCanliYenile(yukle);

  async function detayAc(tur: Tur) {
    if (acik === tur.id) {
      setAcik(null);
      return;
    }
    setAcik(tur.id);
    if (!satislar[tur.id]) {
      const s = await rpc<Satis[]>("admin_tur_satislar", { p_trip: tur.id });
      setSatislar((o) => ({ ...o, [tur.id]: s ?? [] }));
    }
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
      <View style={st.filtreSatir}>
        {FILTRELER.map((f) => {
          const secili = f.anahtar === filtre;
          return (
            <Pressable
              key={f.etiket}
              onPress={() => setFiltre(f.anahtar)}
              style={[st.filtre, secili && st.filtreSecili]}
            >
              <Text style={[st.filtreYazi, secili && { color: "#fff" }]}>{f.etiket}</Text>
            </Pressable>
          );
        })}
      </View>

      {turlar.length === 0 ? (
        <Bos ikon="list-outline" baslik="Kayıt yok" />
      ) : (
        turlar.map((t) => {
          const d = durumRengi[t.status];
          const detayAcik = acik === t.id;
          return (
            <Kart key={t.id} style={{ gap: bosluk.xs }} onPress={() => detayAc(t)}>
              <View style={st.ust}>
                <View style={st.solBaslik}>
                  <Text style={st.turNo}>#{t.code}</Text>
                  <Text style={st.zaman}>{tarihSaat(t.created_at)}</Text>
                </View>
                <Rozet metin={durumEtiketi[t.status]} bg={d.bg} fg={d.fg} />
              </View>
              <Satir etiket="Şoför" deger={t.driver_name} />
              <Satir etiket="Ortacı" deger={t.ortaci_name ?? "—"} />
              <Satir etiket="Müşteri" deger={`${t.customer_count} kişi`} />
              <Satir etiket="Alışveriş" deger={para(t.total_amount)} kalin renkli={renk.yesil} />

              {detayAcik ? (
                <View style={{ gap: bosluk.xs, marginTop: bosluk.sm }}>
                  <View style={st.ayirac} />
                  <Satir etiket="Komisyon" deger={para(t.commission_amount)} renkli={renk.mavi} />
                  <Satir etiket="Şoför payı" deger={para(t.driver_share)} />
                  <Satir etiket="Kalan (yönetim)" deger={para(t.admin_share)} renkli={renk.mor} />
                  {t.completed_at ? (
                    <Satir etiket="Bitiş" deger={tarihSaat(t.completed_at)} />
                  ) : null}
                  {t.note ? <Text style={st.not}>{t.note}</Text> : null}

                  <View style={st.ayirac} />
                  <Text style={st.altBaslik}>Alışverişler</Text>
                  {(satislar[t.id] ?? []).length === 0 ? (
                    <Text style={st.soluk}>Kayıt yok.</Text>
                  ) : (
                    (satislar[t.id] ?? []).map((s) => (
                      <View key={s.id} style={st.satisSatir}>
                        <View style={{ flex: 1 }}>
                          <Text style={st.satisMagaza}>{s.shop_name}</Text>
                          <Text style={st.satisAlt}>
                            %{Number(s.commission_rate)} · komisyon {para(s.commission_amount)}
                            {s.note ? ` · ${s.note}` : ""}
                          </Text>
                        </View>
                        <Text style={st.satisTutar}>{para(s.amount)}</Text>
                      </View>
                    ))
                  )}
                </View>
              ) : null}

              <View style={st.detayIpucu}>
                <Ionicons
                  name={detayAcik ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={renk.soluk}
                />
              </View>
            </Kart>
          );
        })
      )}
    </Ekran>
  );
}

const st = StyleSheet.create({
  filtreSatir: { flexDirection: "row", flexWrap: "wrap", gap: bosluk.xs },
  filtre: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: renk.cizgi,
  },
  filtreSecili: { backgroundColor: renk.lacivert, borderColor: renk.lacivert },
  filtreYazi: { fontSize: 12.5, fontWeight: "700", color: renk.soluk },

  ust: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  solBaslik: { flexDirection: "row", alignItems: "baseline", gap: bosluk.sm },
  turNo: { fontSize: 15, fontWeight: "900", color: renk.metin },
  zaman: { fontSize: 11.5, color: renk.soluk },
  ayirac: { height: 1, backgroundColor: renk.cizgi, marginVertical: 4 },
  altBaslik: { fontSize: 13, fontWeight: "800", color: renk.metin },
  soluk: { color: renk.soluk, fontSize: 13 },
  not: { fontSize: 12.5, color: renk.soluk, fontStyle: "italic" },

  satisSatir: { flexDirection: "row", alignItems: "center", gap: bosluk.md, paddingVertical: 3 },
  satisMagaza: { fontSize: 13.5, fontWeight: "700", color: renk.metin },
  satisAlt: { fontSize: 11.5, color: renk.soluk },
  satisTutar: { fontSize: 14, fontWeight: "800", color: renk.metin },

  detayIpucu: { alignItems: "center", marginTop: 2 },
});
