import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ekran } from "@/components/Ekran";
import { Bos, Kart } from "@/components/ui";
import { useBildirim } from "@/lib/bildirim";
import { gecenSure } from "@/lib/format";
import { bosluk, renk } from "@/lib/theme";

const ikonlar: Record<string, { ad: keyof typeof Ionicons.glyphMap; renk: string }> = {
  yeni_tur: { ad: "people", renk: renk.turuncu },
  atandi: { ad: "person-add", renk: renk.mavi },
  alindi: { ad: "walk", renk: renk.mor },
  satis: { ad: "cart", renk: renk.yesil },
  tamamlandi: { ad: "checkmark-done", renk: renk.yesil },
  iptal: { ad: "close-circle", renk: renk.kirmizi },
};

export default function Bildirimler() {
  const { liste, hepsiniOkunduYap, yenile } = useBildirim();

  useEffect(() => {
    hepsiniOkunduYap();
  }, [hepsiniOkunduYap]);

  return (
    <Ekran onYenile={yenile}>
      {liste.length === 0 ? (
        <Bos
          ikon="notifications-outline"
          baslik="Henüz bildirim yok"
          aciklama="Sistemdeki hareketler burada listelenir."
        />
      ) : (
        liste.map((b) => {
          const i = ikonlar[b.type] ?? { ad: "notifications" as const, renk: renk.soluk };
          return (
            <Kart key={b.id} style={st.kart}>
              <View style={[st.ikon, { backgroundColor: i.renk + "1A" }]}>
                <Ionicons name={i.ad} size={18} color={i.renk} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.baslik}>{b.title}</Text>
                <Text style={st.govde}>{b.body}</Text>
                <Text style={st.zaman}>{gecenSure(b.created_at)}</Text>
              </View>
            </Kart>
          );
        })
      )}
    </Ekran>
  );
}

const st = StyleSheet.create({
  kart: { flexDirection: "row", gap: bosluk.md, alignItems: "flex-start" },
  ikon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  baslik: { fontSize: 14.5, fontWeight: "800", color: renk.metin },
  govde: { fontSize: 13.5, color: renk.soluk, lineHeight: 19 },
  zaman: { fontSize: 11.5, color: "#94A3B8", marginTop: 2 },
});
