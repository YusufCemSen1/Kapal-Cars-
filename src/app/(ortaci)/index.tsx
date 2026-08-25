import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ekran } from "@/components/Ekran";
import { MagazaSecici, type Magaza } from "@/components/MagazaSecici";
import { Alan, Baslik, Bos, Dugme, Kart, Rozet, Satir, Uyari } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useCanliYenile } from "@/lib/bildirim";
import { gecenSure, para, saat, tutarCozumle } from "@/lib/format";
import { rpc } from "@/lib/supabase";
import { bosluk, durumEtiketi, durumRengi, renk, yuvarlak, type DurumAnahtari } from "@/lib/theme";

type Bekleyen = {
  id: string;
  code: number;
  eta_minutes: number;
  customer_count: number;
  note: string | null;
  created_at: string;
};

type Tur = Bekleyen & {
  status: DurumAnahtari;
  total_amount: string;
  completed_at: string | null;
};

type Satis = {
  id: string;
  shop_name: string;
  amount: string;
  note: string | null;
  created_at: string;
};

function onayla(baslik: string, mesaj: string, onTamam: () => void) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${baslik}\n\n${mesaj}`)) onTamam();
    return;
  }
  Alert.alert(baslik, mesaj, [
    { text: "Vazgeç", style: "cancel" },
    { text: "Onayla", onPress: onTamam },
  ]);
}

export default function OrtaciAna() {
  const { profil, musaitlikAyarla, profiliYenile } = useAuth();

  const [bekleyenler, setBekleyenler] = useState<Bekleyen[]>([]);
  const [aktif, setAktif] = useState<Tur | null>(null);
  const [satislar, setSatislar] = useState<Satis[]>([]);
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);

  const [seciliMagaza, setSeciliMagaza] = useState<Magaza | null>(null);
  const [tutar, setTutar] = useState("");
  const [satisNotu, setSatisNotu] = useState("");

  const [hata, setHata] = useState<string | null>(null);
  const [islemde, setIslemde] = useState(false);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const [b, t, m] = await Promise.all([
        rpc<Bekleyen[]>("ortaci_bekleyenler"),
        rpc<Tur[]>("ortaci_turlarim", { p_limit: 10 }),
        rpc<Magaza[]>("ortaci_magazalar"),
      ]);
      setBekleyenler(b ?? []);
      setMagazalar(m ?? []);

      const acik = (t ?? []).find((x) => x.status === "atandi" || x.status === "alindi") ?? null;
      setAktif(acik);
      setSatislar(acik ? await rpc<Satis[]>("ortaci_satislar", { p_trip: acik.id }) : []);
      await profiliYenile();
    } catch (e) {
      setHata((e as Error).message);
    }
  }, [profiliYenile]);

  useEffect(() => {
    void yukle();
  }, [yukle]);
  useCanliYenile(yukle);

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

  const musait = Boolean(profil?.is_available);
  const toplam = satislar.reduce((acc, s) => acc + Number(s.amount), 0);

  return (
    <Ekran
      yenileniyor={yenileniyor}
      onYenile={async () => {
        setYenileniyor(true);
        await yukle();
        setYenileniyor(false);
      }}
    >
      <Baslik ust="Ortacı">{profil?.full_name ?? ""}</Baslik>

      {/* --------------------------------------------------- müsaitlik butonu */}
      <Pressable
        onPress={() =>
          calistir(async () => {
            await musaitlikAyarla(!musait);
          })
        }
        disabled={islemde}
        style={[
          st.musaitlik,
          { backgroundColor: musait ? renk.yesil : renk.kirmizi },
          islemde && { opacity: 0.6 },
        ]}
      >
        <View style={st.musaitlikIkon}>
          <Ionicons name={musait ? "checkmark-circle" : "hand-left"} size={26} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.musaitlikBaslik}>{musait ? "MÜSAİTİM" : "MÜSAİT DEĞİLİM"}</Text>
          <Text style={st.musaitlikAlt}>
            {musait
              ? "Yeni müşteri alabilirsiniz. Kapatmak için dokunun."
              : "Yeni müşteri gelmeyecek. Açmak için dokunun."}
          </Text>
        </View>
        <Ionicons name="swap-horizontal" size={20} color="rgba(255,255,255,0.7)" />
      </Pressable>

      {hata ? <Uyari metin={hata} /> : null}

      {/* ------------------------------------------------------- aktif tur */}
      {aktif ? (
        <Kart style={{ gap: bosluk.md }}>
          <View style={st.ust}>
            <Text style={st.turNo}>Aktif tur · #{aktif.code}</Text>
            <Rozet
              metin={durumEtiketi[aktif.status]}
              bg={durumRengi[aktif.status].bg}
              fg={durumRengi[aktif.status].fg}
            />
          </View>
          <Satir etiket="Müşteri" deger={`${aktif.customer_count} kişi`} />
          <Satir etiket="Bildirim" deger={`${saat(aktif.created_at)} · ${aktif.eta_minutes} dk`} />
          {aktif.note ? <Text style={st.not}>{aktif.note}</Text> : null}

          {aktif.status === "atandi" ? (
            <Dugme
              baslik="Müşteriyi teslim aldım"
              ikon="hand-right"
              tam
              yukleniyor={islemde}
              onPress={() =>
                calistir(() => rpc("ortaci_musteri_alindi", { p_trip: aktif.id }))
              }
            />
          ) : null}

          {/* ------------------------------------------- alışveriş girişi */}
          <View style={st.ayirac} />
          <Text style={st.bolum}>Alışveriş ekle</Text>

          <MagazaSecici magazalar={magazalar} secili={seciliMagaza} onSec={setSeciliMagaza} />
          <Alan
            etiket="Tutar"
            placeholder="0"
            keyboardType="decimal-pad"
            value={tutar}
            onChangeText={setTutar}
            ipucu="Müşterinin o mağazada harcadığı toplam tutar."
          />
          <Alan
            etiket="Not (isteğe bağlı)"
            placeholder="Örn. 2 halı"
            value={satisNotu}
            onChangeText={setSatisNotu}
            maxLength={100}
          />
          <Dugme
            baslik="Alışverişi kaydet"
            ikon="add-circle"
            tur="yesil"
            tam
            yukleniyor={islemde}
            pasif={!seciliMagaza || !tutarCozumle(tutar)}
            onPress={() =>
              calistir(async () => {
                const miktar = tutarCozumle(tutar);
                if (!seciliMagaza || !miktar) throw new Error("Mağaza ve tutar gerekli.");
                await rpc("ortaci_satis_ekle", {
                  p_trip: aktif.id,
                  p_shop: seciliMagaza.id,
                  p_amount: miktar,
                  p_note: satisNotu.trim() || null,
                });
                setTutar("");
                setSatisNotu("");
              })
            }
          />

          {/* -------------------------------------------- girilen alışveriş */}
          {satislar.length > 0 ? (
            <View style={{ gap: bosluk.sm, marginTop: bosluk.sm }}>
              <View style={st.ayirac} />
              {satislar.map((s) => (
                <View key={s.id} style={st.satisSatir}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.satisMagaza}>{s.shop_name}</Text>
                    <Text style={st.satisZaman}>
                      {saat(s.created_at)}
                      {s.note ? ` · ${s.note}` : ""}
                    </Text>
                  </View>
                  <Text style={st.satisTutar}>{para(s.amount)}</Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      onayla("Kaydı sil", `${s.shop_name} · ${para(s.amount)}`, () =>
                        void calistir(() => rpc("ortaci_satis_sil", { p_sale: s.id })),
                      )
                    }
                  >
                    <Ionicons name="trash-outline" size={17} color={renk.kirmizi} />
                  </Pressable>
                </View>
              ))}
              <View style={st.ayirac} />
              <Satir etiket="Toplam" deger={para(toplam)} kalin renkli={renk.yesil} />
            </View>
          ) : null}

          <Dugme
            baslik="Alışverişi tamamla"
            ikon="checkmark-done"
            tur={satislar.length ? "birincil" : "sade"}
            tam
            yukleniyor={islemde}
            onPress={() =>
              onayla(
                "Alışverişi tamamla",
                satislar.length
                  ? `Toplam ${para(toplam)}. Tur kapatılsın mı?`
                  : "Hiç alışveriş girilmedi. Yine de kapatılsın mı?",
                () => void calistir(() => rpc("ortaci_tur_tamamla", { p_trip: aktif.id })),
              )
            }
          />
        </Kart>
      ) : null}

      {/* ------------------------------------------------ bekleyen müşteriler */}
      <Text style={st.bolumBaslik}>Gelen müşteriler</Text>
      {bekleyenler.length === 0 ? (
        <Kart>
          <Bos
            ikon="people-outline"
            baslik="Bekleyen müşteri yok"
            aciklama="Şoför müşteri bildirdiğinde burada anında görünür."
          />
        </Kart>
      ) : (
        bekleyenler.map((b) => (
          <Kart key={b.id} style={{ gap: bosluk.sm }}>
            <View style={st.ust}>
              <View style={st.dakikaRozet}>
                <Text style={st.dakikaSayi}>{b.eta_minutes}</Text>
                <Text style={st.dakikaBirim}>dk</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.bekleyenBaslik}>{b.customer_count} müşteri geliyor</Text>
                <Text style={st.bekleyenAlt}>
                  #{b.code} · {gecenSure(b.created_at)}
                </Text>
              </View>
            </View>
            {b.note ? <Text style={st.not}>{b.note}</Text> : null}
            <Dugme
              baslik={aktif ? "Önce mevcut turu bitirin" : "Bu müşteriyi üstlen"}
              ikon="hand-right"
              tur="yesil"
              tam
              pasif={Boolean(aktif)}
              yukleniyor={islemde}
              onPress={() => calistir(() => rpc("ortaci_tur_al", { p_trip: b.id }))}
            />
          </Kart>
        ))
      )}
    </Ekran>
  );
}

const st = StyleSheet.create({
  musaitlik: {
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.md,
    borderRadius: yuvarlak.lg,
    padding: bosluk.lg,
  },
  musaitlikIkon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  musaitlikBaslik: { color: "#fff", fontSize: 17, fontWeight: "900", letterSpacing: 0.6 },
  musaitlikAlt: { color: "rgba(255,255,255,0.8)", fontSize: 12.5, marginTop: 2 },

  ust: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: bosluk.md },
  turNo: { fontSize: 15, fontWeight: "900", color: renk.metin },
  not: { fontSize: 12.5, color: renk.soluk, fontStyle: "italic" },
  ayirac: { height: 1, backgroundColor: renk.cizgi, marginVertical: 2 },
  bolum: { fontSize: 14, fontWeight: "800", color: renk.metin },
  bolumBaslik: { fontSize: 15, fontWeight: "800", color: renk.metin, marginTop: bosluk.sm },

  satisSatir: { flexDirection: "row", alignItems: "center", gap: bosluk.md },
  satisMagaza: { fontSize: 14, fontWeight: "700", color: renk.metin },
  satisZaman: { fontSize: 11.5, color: renk.soluk },
  satisTutar: { fontSize: 14.5, fontWeight: "800", color: renk.metin },

  dakikaRozet: {
    width: 52,
    height: 52,
    borderRadius: yuvarlak.md,
    backgroundColor: renk.turuncuAcik,
    alignItems: "center",
    justifyContent: "center",
  },
  dakikaSayi: { fontSize: 20, fontWeight: "900", color: renk.turuncu, lineHeight: 22 },
  dakikaBirim: { fontSize: 10.5, fontWeight: "700", color: renk.turuncu },
  bekleyenBaslik: { fontSize: 15.5, fontWeight: "800", color: renk.metin },
  bekleyenAlt: { fontSize: 12, color: renk.soluk, marginTop: 1 },
});
