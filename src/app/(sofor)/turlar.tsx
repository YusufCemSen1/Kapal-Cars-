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
  eta_minutes: number;
  customer_count: number;
  note: string | null;
  status: DurumAnahtari;
  total_amount: string;
  created_at: string;
  picked_up_at: string | null;
  completed_at: string | null;
};

export default function SoforTurlar() {
  const [turlar, setTurlar] = useState<Tur[]>([]);
  const [ozet, setOzet] = useState<{ toplam_tur: number; toplam_tutar: string } | null>(null);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    const [t, o] = await Promise.all([
      rpc<Tur[]>("sofor_turlarim", { p_limit: 100 }),
      rpc<{ toplam_tur: number; toplam_tutar: string }[]>("sofor_ozet"),
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
      <View style={st.istatistikSatir}>
        <Istatistik etiket="Toplam tur" deger={String(ozet?.toplam_tur ?? 0)} ikon="car-outline" />
        <Istatistik
          etiket="Toplam alışveriş"
          deger={para(ozet?.toplam_tutar)}
          vurgu={renk.yesil}
          ikon="cash-outline"
        />
      </View>

      {turlar.length === 0 ? (
        <Bos
          ikon="car-outline"
          baslik="Henüz tur yok"
          aciklama="Müşteri bildirdiğinizde turlarınız burada görünür."
        />
      ) : (
        turlar.map((t) => {
          const d = durumRengi[t.status];
          return (
            <Kart key={t.id} style={{ gap: bosluk.xs }}>
              <View style={st.ust}>
                <Text style={st.turNo}>#{t.code}</Text>
                <Rozet metin={durumEtiketi[t.status]} bg={d.bg} fg={d.fg} />
              </View>
              <Satir etiket="Bildirim" deger={tarihSaat(t.created_at)} />
              <Satir etiket="Müşteri" deger={`${t.customer_count} kişi`} />
              {t.completed_at ? (
                <Satir etiket="Bitiş" deger={tarihSaat(t.completed_at)} />
              ) : null}
              <Satir
                etiket="Toplam alışveriş"
                deger={para(t.total_amount)}
                kalin
                renkli={t.status === "tamamlandi" ? renk.yesil : renk.soluk}
              />
            </Kart>
          );
        })
      )}
    </Ekran>
  );
}

const st = StyleSheet.create({
  istatistikSatir: { flexDirection: "row", gap: bosluk.sm },
  ust: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  turNo: { fontSize: 15, fontWeight: "900", color: renk.metin },
});
