import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ekran } from "@/components/Ekran";
import { Bos, Istatistik, Kart, Rozet, Satir } from "@/components/ui";
import { useCanliYenile } from "@/lib/bildirim";
import { para, tarihSaat } from "@/lib/format";
import { rpc } from "@/lib/supabase";
import { bosluk, durumEtiketi, durumRengi, renk, type DurumAnahtari } from "@/lib/theme";

type Tur = {
  id: string;
  code: number;
  customer_count: number;
  status: DurumAnahtari;
  total_amount: string;
  created_at: string;
  completed_at: string | null;
};

export default function OrtaciGecmis() {
  const [turlar, setTurlar] = useState<Tur[]>([]);
  const [ozet, setOzet] = useState<{
    bugun_tur: number;
    bugun_tutar: string;
    toplam_tur: number;
    toplam_tutar: string;
  } | null>(null);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    const [t, o] = await Promise.all([
      rpc<Tur[]>("ortaci_turlarim", { p_limit: 100 }),
      rpc<
        { bugun_tur: number; bugun_tutar: string; toplam_tur: number; toplam_tutar: string }[]
      >("ortaci_ozet"),
    ]);
    setTurlar(t ?? []);
    setOzet(Array.isArray(o) ? o[0] : null);
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);
  useCanliYenile(yukle);

  return (
    <Ekran
      yenileniyor={yenileniyor}
      onYenile={async () => {
        setYenileniyor(true);
        await yukle();
        setYenileniyor(false);
      }}
    >
      <View style={st.satir}>
        <Istatistik etiket="Bugün" deger={String(ozet?.bugun_tur ?? 0)} ikon="today-outline" />
        <Istatistik
          etiket="Bugünkü tutar"
          deger={para(ozet?.bugun_tutar)}
          vurgu={renk.yesil}
          ikon="cash-outline"
        />
      </View>
      <View style={st.satir}>
        <Istatistik etiket="Toplam tur" deger={String(ozet?.toplam_tur ?? 0)} ikon="albums-outline" />
        <Istatistik
          etiket="Toplam tutar"
          deger={para(ozet?.toplam_tutar)}
          vurgu={renk.yesil}
          ikon="trending-up-outline"
        />
      </View>

      {turlar.length === 0 ? (
        <Bos ikon="time-outline" baslik="Henüz tur yok" />
      ) : (
        turlar.map((t) => (
          <Kart key={t.id} style={{ gap: bosluk.xs }}>
            <View style={st.ust}>
              <Text style={st.turNo}>#{t.code}</Text>
              <Rozet
                metin={durumEtiketi[t.status]}
                bg={durumRengi[t.status].bg}
                fg={durumRengi[t.status].fg}
              />
            </View>
            <Satir etiket="Müşteri" deger={`${t.customer_count} kişi`} />
            <Satir etiket="Tarih" deger={tarihSaat(t.completed_at ?? t.created_at)} />
            <Satir etiket="Toplam alışveriş" deger={para(t.total_amount)} kalin renkli={renk.yesil} />
          </Kart>
        ))
      )}
    </Ekran>
  );
}

const st = StyleSheet.create({
  satir: { flexDirection: "row", gap: bosluk.sm },
  ust: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  turNo: { fontSize: 15, fontWeight: "900", color: renk.metin },
});
