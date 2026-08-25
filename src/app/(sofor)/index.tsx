import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ekran } from "@/components/Ekran";
import { Alan, Baslik, Dugme, Istatistik, Kart, Rozet, Satir, Uyari } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useCanliYenile } from "@/lib/bildirim";
import { para, saat } from "@/lib/format";
import { rpc } from "@/lib/supabase";
import { bosluk, durumEtiketi, durumRengi, renk, yuvarlak, type DurumAnahtari } from "@/lib/theme";

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

type Ozet = {
  bugun_tur: number;
  bugun_tutar: string;
  aktif_tur: number;
  toplam_tur: number;
  toplam_tutar: string;
};

const HIZLI_DAKIKA = [5, 10, 15, 20];

export default function SoforAna() {
  const { profil } = useAuth();
  const [dakika, setDakika] = useState(5);
  const [kisi, setKisi] = useState(1);
  const [not, setNot] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const [ozet, setOzet] = useState<Ozet | null>(null);
  const [aktifler, setAktifler] = useState<Tur[]>([]);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const [o, t] = await Promise.all([
        rpc<Ozet[]>("sofor_ozet"),
        rpc<Tur[]>("sofor_turlarim", { p_limit: 20 }),
      ]);
      setOzet(Array.isArray(o) ? o[0] : null);
      setAktifler(
        (t ?? []).filter((x) =>
          ["bekliyor", "atandi", "alindi"].includes(x.status),
        ),
      );
    } catch (e) {
      setHata((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);
  useCanliYenile(yukle);

  async function bildir() {
    setHata(null);
    setMesaj(null);
    setGonderiliyor(true);
    try {
      await rpc("sofor_tur_bildir", {
        p_eta: dakika,
        p_customer_count: kisi,
        p_note: not.trim() || null,
      });
      setMesaj(`${dakika} dakika · ${kisi} müşteri bildirildi. Ortacılara iletildi.`);
      setNot("");
      setKisi(1);
      await yukle();
    } catch (e) {
      setHata((e as Error).message);
    } finally {
      setGonderiliyor(false);
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
      <Baslik ust="Şoför">{profil?.full_name ?? ""}</Baslik>

      {/* ---------------------------------------------------- bildirim formu */}
      <Kart style={{ gap: bosluk.lg }}>
        <Text style={st.kartBaslik}>Müşteri ne zaman ulaşacak?</Text>

        <View style={st.dakikaSatir}>
          {HIZLI_DAKIKA.map((d) => {
            const secili = d === dakika;
            return (
              <Pressable
                key={d}
                onPress={() => setDakika(d)}
                style={[st.dakikaKutu, secili && st.dakikaSecili]}
              >
                <Text style={[st.dakikaSayi, secili && { color: "#fff" }]}>{d}</Text>
                <Text style={[st.dakikaBirim, secili && { color: "rgba(255,255,255,0.8)" }]}>
                  dakika
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={st.kisiSatir}>
          <Text style={st.etiket}>Müşteri sayısı</Text>
          <View style={st.sayac}>
            <Pressable
              onPress={() => setKisi((k) => Math.max(1, k - 1))}
              style={st.sayacDugme}
              hitSlop={6}
            >
              <Ionicons name="remove" size={20} color={renk.mavi} />
            </Pressable>
            <Text style={st.sayacDeger}>{kisi}</Text>
            <Pressable
              onPress={() => setKisi((k) => Math.min(60, k + 1))}
              style={st.sayacDugme}
              hitSlop={6}
            >
              <Ionicons name="add" size={20} color={renk.mavi} />
            </Pressable>
          </View>
        </View>

        <Alan
          etiket="Not (isteğe bağlı)"
          placeholder="Örn. Nuruosmaniye kapısı"
          value={not}
          onChangeText={setNot}
          maxLength={120}
        />

        {mesaj ? <Uyari tur="bilgi" metin={mesaj} /> : null}
        {hata ? <Uyari metin={hata} /> : null}

        <Dugme
          baslik={`${dakika} dakika sonra geliyor — bildir`}
          onPress={bildir}
          yukleniyor={gonderiliyor}
          ikon="megaphone"
          tam
        />
      </Kart>

      {/* ------------------------------------------------------------ özet */}
      <View style={st.istatistikSatir}>
        <Istatistik
          etiket="Bugünkü tur"
          deger={String(ozet?.bugun_tur ?? 0)}
          ikon="today-outline"
        />
        <Istatistik
          etiket="Bugünkü alışveriş"
          deger={para(ozet?.bugun_tutar)}
          vurgu={renk.yesil}
          ikon="cash-outline"
        />
        <Istatistik
          etiket="Devam eden"
          deger={String(ozet?.aktif_tur ?? 0)}
          ikon="time-outline"
        />
      </View>

      {/* ----------------------------------------------------- açık turlar */}
      <Text style={st.bolumBaslik}>Devam eden turlar</Text>
      {aktifler.length === 0 ? (
        <Kart>
          <Text style={st.solukYazi}>Şu anda devam eden tur yok.</Text>
        </Kart>
      ) : (
        aktifler.map((t) => {
          const d = durumRengi[t.status];
          return (
            <Kart key={t.id} style={{ gap: bosluk.sm }}>
              <View style={st.turUst}>
                <Text style={st.turNo}>#{t.code}</Text>
                <Rozet metin={durumEtiketi[t.status]} bg={d.bg} fg={d.fg} />
              </View>
              <Satir etiket="Bildirim" deger={`${saat(t.created_at)} · ${t.eta_minutes} dk`} />
              <Satir etiket="Müşteri" deger={`${t.customer_count} kişi`} />
              <Satir etiket="Teslim alındı" deger={saat(t.picked_up_at)} />
              <Satir
                etiket="Toplam alışveriş"
                deger={para(t.total_amount)}
                kalin
                renkli={renk.yesil}
              />
              {t.note ? <Text style={st.not}>{t.note}</Text> : null}
            </Kart>
          );
        })
      )}
    </Ekran>
  );
}

const st = StyleSheet.create({
  kartBaslik: { fontSize: 15, fontWeight: "800", color: renk.metin },
  dakikaSatir: { flexDirection: "row", gap: bosluk.sm },
  dakikaKutu: {
    flex: 1,
    alignItems: "center",
    paddingVertical: bosluk.md,
    borderRadius: yuvarlak.md,
    borderWidth: 1,
    borderColor: renk.cizgi,
    backgroundColor: "#F8FAFC",
  },
  dakikaSecili: { backgroundColor: renk.mavi, borderColor: renk.mavi },
  dakikaSayi: { fontSize: 21, fontWeight: "900", color: renk.metin },
  dakikaBirim: { fontSize: 11, color: renk.soluk, fontWeight: "600" },

  kisiSatir: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  etiket: { fontSize: 13, fontWeight: "700", color: renk.metin },
  sayac: {
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.lg,
    borderWidth: 1,
    borderColor: renk.cizgi,
    borderRadius: yuvarlak.md,
    paddingHorizontal: bosluk.md,
    paddingVertical: 6,
  },
  sayacDugme: { padding: 2 },
  sayacDeger: { fontSize: 18, fontWeight: "800", minWidth: 26, textAlign: "center", color: renk.metin },

  istatistikSatir: { flexDirection: "row", flexWrap: "wrap", gap: bosluk.sm },
  bolumBaslik: { fontSize: 15, fontWeight: "800", color: renk.metin, marginTop: bosluk.sm },
  solukYazi: { color: renk.soluk, fontSize: 13.5 },

  turUst: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  turNo: { fontSize: 15, fontWeight: "900", color: renk.metin },
  not: { fontSize: 12.5, color: renk.soluk, fontStyle: "italic", marginTop: 2 },
});
