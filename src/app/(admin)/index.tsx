import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ekran } from "@/components/Ekran";
import { Baslik, Dugme, Istatistik, Kart, Rozet, Satir } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useCanliYenile } from "@/lib/bildirim";
import { gecenSure, para, saat } from "@/lib/format";
import { rpc, supabase } from "@/lib/supabase";
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

type Ozet = {
  tur_sayisi: number;
  musteri_sayisi: number;
  toplam_ciro: string;
  toplam_komisyon: string;
  sofor_payi: string;
  admin_payi: string;
  bekleyen: number;
  devam_eden: number;
  musait_ortaci: number;
};

type Ortaci = { id: string; full_name: string; is_available: boolean };

export default function AdminCanli() {
  const { profil } = useAuth();
  const [ozet, setOzet] = useState<Ozet | null>(null);
  const [turlar, setTurlar] = useState<Tur[]>([]);
  const [ortacilar, setOrtacilar] = useState<Ortaci[]>([]);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [islemde, setIslemde] = useState(false);

  const yukle = useCallback(async () => {
    const [o, t, p] = await Promise.all([
      rpc<Ozet[]>("admin_ozet"),
      rpc<Tur[]>("admin_turlar", { p_limit: 60 }),
      supabase
        .from("profiles")
        .select("id,full_name,is_available")
        .eq("role", "ortaci")
        .eq("is_active", true)
        .order("full_name"),
    ]);
    setOzet(Array.isArray(o) ? o[0] : null);
    setTurlar((t ?? []).filter((x) => ["bekliyor", "atandi", "alindi"].includes(x.status)));
    setOrtacilar((p.data as Ortaci[]) ?? []);
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);
  useCanliYenile(yukle);

  // Adminin tabloları doğrudan okuma yetkisi var: turlar anlık akar.
  useEffect(() => {
    const kanal = supabase
      .channel("admin-canli")
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => void yukle())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => void yukle())
      .subscribe();
    return () => {
      supabase.removeChannel(kanal);
    };
  }, [yukle]);

  async function ata(tur: Tur) {
    const musaitler = ortacilar.filter((o) => o.is_available);
    const secenekler = (musaitler.length ? musaitler : ortacilar).slice(0, 8);
    if (secenekler.length === 0) return;

    const uygula = (ortaciId: string) =>
      void (async () => {
        setIslemde(true);
        try {
          await rpc("admin_tur_ata", { p_trip: tur.id, p_ortaci: ortaciId });
          await yukle();
        } finally {
          setIslemde(false);
        }
      })();

    if (Platform.OS === "web") {
      const liste = secenekler.map((o, i) => `${i + 1}. ${o.full_name}`).join("\n");
      // eslint-disable-next-line no-alert
      const cevap = window.prompt(`#${tur.code} kime atansın?\n${liste}\n\nNumara girin:`);
      const idx = Number(cevap) - 1;
      if (secenekler[idx]) uygula(secenekler[idx].id);
      return;
    }
    Alert.alert(
      `#${tur.code} ata`,
      "Turu üstlenecek ortacıyı seçin.",
      [
        ...secenekler.map((o) => ({
          text: o.full_name + (o.is_available ? "" : " (meşgul)"),
          onPress: () => uygula(o.id),
        })),
        { text: "Vazgeç", style: "cancel" as const },
      ],
      { cancelable: true },
    );
  }

  function iptal(tur: Tur) {
    const calistir = () =>
      void (async () => {
        setIslemde(true);
        try {
          await rpc("admin_tur_iptal", { p_trip: tur.id });
          await yukle();
        } finally {
          setIslemde(false);
        }
      })();

    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (window.confirm(`#${tur.code} iptal edilsin mi?`)) calistir();
      return;
    }
    Alert.alert("Turu iptal et", `#${tur.code} iptal edilsin mi?`, [
      { text: "Vazgeç", style: "cancel" },
      { text: "İptal et", style: "destructive", onPress: calistir },
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
      <Baslik ust="Yönetim">{profil?.full_name ?? ""}</Baslik>

      {/* ------------------------------------------------------ bugün özeti */}
      <Text style={st.bolumBaslik}>Bugün</Text>
      <View style={st.izgara}>
        <Istatistik etiket="Tamamlanan tur" deger={String(ozet?.tur_sayisi ?? 0)} ikon="checkmark-done-outline" />
        <Istatistik etiket="Müşteri" deger={String(ozet?.musteri_sayisi ?? 0)} ikon="people-outline" />
        <Istatistik etiket="Ciro" deger={para(ozet?.toplam_ciro)} vurgu={renk.yesil} ikon="cash-outline" />
        <Istatistik etiket="Komisyon" deger={para(ozet?.toplam_komisyon)} vurgu={renk.mavi} ikon="pricetag-outline" />
        <Istatistik etiket="Şoför payı" deger={para(ozet?.sofor_payi)} ikon="car-outline" />
        <Istatistik etiket="Kalan (siz)" deger={para(ozet?.admin_payi)} vurgu={renk.mor} ikon="wallet-outline" />
      </View>

      {/* -------------------------------------------------------- ortacılar */}
      <Text style={st.bolumBaslik}>
        Ortacılar · {ozet?.musait_ortaci ?? 0} müsait
      </Text>
      <Kart style={{ gap: bosluk.sm }}>
        {ortacilar.length === 0 ? (
          <Text style={st.soluk}>Tanımlı ortacı yok.</Text>
        ) : (
          ortacilar.map((o) => (
            <View key={o.id} style={st.ortaciSatir}>
              <View
                style={[
                  st.isik,
                  { backgroundColor: o.is_available ? renk.yesil : renk.kirmizi },
                ]}
              />
              <Text style={st.ortaciAd}>{o.full_name}</Text>
              <Text style={[st.ortaciDurum, { color: o.is_available ? renk.yesil : renk.kirmizi }]}>
                {o.is_available ? "Müsait" : "Meşgul"}
              </Text>
            </View>
          ))
        )}
      </Kart>

      {/* ------------------------------------------------------ açık turlar */}
      <Text style={st.bolumBaslik}>
        Açık turlar · {(ozet?.bekleyen ?? 0) + (ozet?.devam_eden ?? 0)}
      </Text>
      {turlar.length === 0 ? (
        <Kart>
          <Text style={st.soluk}>Şu anda açık tur yok.</Text>
        </Kart>
      ) : (
        turlar.map((t) => {
          const d = durumRengi[t.status];
          return (
            <Kart key={t.id} style={{ gap: bosluk.xs }}>
              <View style={st.ust}>
                <View style={st.baslikSol}>
                  <Text style={st.turNo}>#{t.code}</Text>
                  <Text style={st.zaman}>{gecenSure(t.created_at)}</Text>
                </View>
                <Rozet metin={durumEtiketi[t.status]} bg={d.bg} fg={d.fg} />
              </View>
              <Satir etiket="Şoför" deger={t.driver_name} />
              <Satir etiket="Ortacı" deger={t.ortaci_name ?? "— atanmadı —"} />
              <Satir etiket="Müşteri" deger={`${t.customer_count} kişi · ${t.eta_minutes} dk`} />
              <Satir etiket="Bildirim" deger={saat(t.created_at)} />
              {t.picked_up_at ? <Satir etiket="Teslim" deger={saat(t.picked_up_at)} /> : null}
              <Satir etiket="Alışveriş" deger={para(t.total_amount)} kalin renkli={renk.yesil} />
              {t.note ? <Text style={st.not}>{t.note}</Text> : null}

              <View style={st.aksiyonlar}>
                <Dugme
                  baslik={t.ortaci_name ? "Ortacıyı değiştir" : "Ortacı ata"}
                  tur="ikincil"
                  kucuk
                  ikon="person-add-outline"
                  pasif={islemde}
                  onPress={() => ata(t)}
                />
                <Dugme
                  baslik="İptal"
                  tur="sade"
                  kucuk
                  ikon="close-circle-outline"
                  pasif={islemde}
                  onPress={() => iptal(t)}
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
  bolumBaslik: { fontSize: 15, fontWeight: "800", color: renk.metin, marginTop: bosluk.sm },
  izgara: { flexDirection: "row", flexWrap: "wrap", gap: bosluk.sm },
  soluk: { color: renk.soluk, fontSize: 13.5 },

  ortaciSatir: { flexDirection: "row", alignItems: "center", gap: bosluk.md, paddingVertical: 3 },
  isik: { width: 11, height: 11, borderRadius: 6 },
  ortaciAd: { flex: 1, fontSize: 14.5, fontWeight: "600", color: renk.metin },
  ortaciDurum: { fontSize: 12.5, fontWeight: "700" },

  ust: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  baslikSol: { flexDirection: "row", alignItems: "baseline", gap: bosluk.sm },
  turNo: { fontSize: 15, fontWeight: "900", color: renk.metin },
  zaman: { fontSize: 11.5, color: renk.soluk },
  not: { fontSize: 12.5, color: renk.soluk, fontStyle: "italic", marginTop: 2 },
  aksiyonlar: { flexDirection: "row", gap: bosluk.sm, marginTop: bosluk.sm },
});
