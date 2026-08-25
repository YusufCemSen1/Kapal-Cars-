import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ekran } from "@/components/Ekran";
import { Alan, Dugme, Kart, Rozet, Uyari } from "@/components/ui";
import type { Rol } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { tarihSaat } from "@/lib/format";
import { callFunction, supabase } from "@/lib/supabase";
import { bosluk, renk, yuvarlak } from "@/lib/theme";

type Kullanici = {
  id: string;
  full_name: string;
  role: Rol;
  phone: string | null;
  is_active: boolean;
  is_available: boolean;
  created_at: string;
};

const ROLLER: { anahtar: Rol; etiket: string; ikon: keyof typeof Ionicons.glyphMap }[] = [
  { anahtar: "sofor", etiket: "Şoför", ikon: "car" },
  { anahtar: "ortaci", etiket: "Ortacı", ikon: "walk" },
  { anahtar: "admin", etiket: "Yönetici", ikon: "shield-checkmark" },
];

const rolRengi: Record<Rol, { bg: string; fg: string; etiket: string }> = {
  admin: { bg: renk.morAcik, fg: renk.mor, etiket: "Yönetici" },
  sofor: { bg: renk.maviAcik, fg: renk.mavi, etiket: "Şoför" },
  ortaci: { bg: renk.turuncuAcik, fg: renk.turuncu, etiket: "Ortacı" },
};

function bilgiVer(baslik: string, mesaj: string) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    window.alert(`${baslik}\n\n${mesaj}`);
    return;
  }
  Alert.alert(baslik, mesaj);
}

function onayla(baslik: string, mesaj: string, onTamam: () => void) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${baslik}\n\n${mesaj}`)) onTamam();
    return;
  }
  Alert.alert(baslik, mesaj, [
    { text: "Vazgeç", style: "cancel" },
    { text: "Onayla", style: "destructive", onPress: onTamam },
  ]);
}

export default function AdminKullanicilar() {
  const { profil } = useAuth();
  const [liste, setListe] = useState<Kullanici[]>([]);
  const [formAcik, setFormAcik] = useState(false);
  const [ad, setAd] = useState("");
  const [telefon, setTelefon] = useState("");
  const [rol, setRol] = useState<Rol>("ortaci");
  const [ozelSifre, setOzelSifre] = useState("");
  const [islemde, setIslemde] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [yeniSifre, setYeniSifre] = useState<{ ad: string; kod: string } | null>(null);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id,full_name,role,phone,is_active,is_available,created_at")
      .order("role")
      .order("full_name");
    setListe((data as Kullanici[]) ?? []);
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

  async function olustur() {
    await calistir(async () => {
      const sonuc = await callFunction<{ code: string; full_name: string }>("admin-users", {
        action: "create",
        full_name: ad.trim(),
        role: rol,
        phone: telefon.trim() || null,
        code: ozelSifre.trim() || undefined,
      });
      setYeniSifre({ ad: sonuc.full_name, kod: sonuc.code });
      setAd("");
      setTelefon("");
      setOzelSifre("");
      setFormAcik(false);
    });
  }

  function sifreYenile(k: Kullanici) {
    onayla("Şifre yenile", `${k.full_name} için yeni kişisel şifre üretilsin mi?`, () =>
      void calistir(async () => {
        const sonuc = await callFunction<{ code: string }>("admin-users", {
          action: "reset_code",
          profile_id: k.id,
        });
        setYeniSifre({ ad: k.full_name, kod: sonuc.code });
      }),
    );
  }

  function aktiflikDegistir(k: Kullanici) {
    void calistir(() =>
      callFunction("admin-users", {
        action: "update",
        profile_id: k.id,
        is_active: !k.is_active,
      }),
    );
  }

  function sil(k: Kullanici) {
    onayla(
      "Kullanıcıyı sil",
      `${k.full_name} sistemden kalıcı olarak silinecek. Geçmiş turları etkilenmez.`,
      () =>
        void calistir(() =>
          callFunction("admin-users", { action: "delete", profile_id: k.id }),
        ),
    );
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
      {yeniSifre ? (
        <Kart style={st.sifreKart}>
          <Text style={st.sifreBaslik}>{yeniSifre.ad} için kişisel şifre</Text>
          <Text style={st.sifreKod}>{yeniSifre.kod}</Text>
          <Text style={st.sifreNot}>
            Bu şifre bir daha gösterilmez. Kullanıcıya iletin.
          </Text>
          <View style={st.sifreAksiyon}>
            <Dugme
              baslik="Kopyala"
              ikon="copy-outline"
              tur="ikincil"
              kucuk
              onPress={async () => {
                await Clipboard.setStringAsync(yeniSifre.kod);
                bilgiVer("Kopyalandı", "Şifre panoya kopyalandı.");
              }}
            />
            <Dugme baslik="Tamam" tur="sade" kucuk onPress={() => setYeniSifre(null)} />
          </View>
        </Kart>
      ) : null}

      {hata ? <Uyari metin={hata} /> : null}

      {formAcik ? (
        <Kart style={{ gap: bosluk.md }}>
          <Text style={st.kartBaslik}>Yeni kullanıcı</Text>
          <Alan etiket="Ad soyad" value={ad} onChangeText={setAd} placeholder="Örn. Ahmet Yılmaz" />
          <View style={{ gap: 6 }}>
            <Text style={st.etiket}>Görev</Text>
            <View style={st.rolSatir}>
              {ROLLER.map((r) => {
                const secili = r.anahtar === rol;
                return (
                  <Pressable
                    key={r.anahtar}
                    onPress={() => setRol(r.anahtar)}
                    style={[st.rolKutu, secili && st.rolSecili]}
                  >
                    <Ionicons
                      name={r.ikon}
                      size={17}
                      color={secili ? "#fff" : renk.soluk}
                    />
                    <Text style={[st.rolYazi, secili && { color: "#fff" }]}>{r.etiket}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Alan
            etiket="Telefon (isteğe bağlı)"
            value={telefon}
            onChangeText={setTelefon}
            keyboardType="phone-pad"
            placeholder="05xx xxx xx xx"
          />
          <Alan
            etiket="Kişisel şifre (boş bırakılırsa sistem üretir)"
            value={ozelSifre}
            onChangeText={setOzelSifre}
            autoCapitalize="characters"
            placeholder="En az 4 karakter"
          />
          <View style={st.formAksiyon}>
            <Dugme
              baslik="Oluştur"
              ikon="person-add"
              yukleniyor={islemde}
              pasif={ad.trim().length < 2}
              onPress={olustur}
            />
            <Dugme baslik="Vazgeç" tur="sade" onPress={() => setFormAcik(false)} />
          </View>
        </Kart>
      ) : (
        <Dugme
          baslik="Yeni kullanıcı ekle"
          ikon="person-add"
          tam
          onPress={() => setFormAcik(true)}
        />
      )}

      {liste.map((k) => {
        const r = rolRengi[k.role];
        const benMiyim = k.id === profil?.id;
        return (
          <Kart key={k.id} style={{ gap: bosluk.sm, opacity: k.is_active ? 1 : 0.55 }}>
            <View style={st.ust}>
              <View style={{ flex: 1 }}>
                <Text style={st.ad}>
                  {k.full_name}
                  {benMiyim ? " (siz)" : ""}
                </Text>
                <Text style={st.alt}>
                  {k.phone ? `${k.phone} · ` : ""}
                  {tarihSaat(k.created_at)}
                </Text>
              </View>
              <Rozet metin={r.etiket} bg={r.bg} fg={r.fg} />
            </View>

            <View style={st.durumSatir}>
              {k.role === "ortaci" && k.is_active ? (
                <View style={st.durumOge}>
                  <View
                    style={[
                      st.isik,
                      { backgroundColor: k.is_available ? renk.yesil : renk.kirmizi },
                    ]}
                  />
                  <Text style={st.durumYazi}>{k.is_available ? "Müsait" : "Meşgul"}</Text>
                </View>
              ) : null}
              {!k.is_active ? (
                <Rozet metin="Kapalı" bg={renk.kirmiziAcik} fg={renk.kirmizi} />
              ) : null}
            </View>

            <View style={st.aksiyonlar}>
              <Dugme
                baslik="Şifre yenile"
                tur="ikincil"
                kucuk
                ikon="key-outline"
                pasif={islemde}
                onPress={() => sifreYenile(k)}
              />
              {!benMiyim ? (
                <>
                  <Dugme
                    baslik={k.is_active ? "Kapat" : "Aç"}
                    tur="sade"
                    kucuk
                    ikon={k.is_active ? "pause-outline" : "play-outline"}
                    pasif={islemde}
                    onPress={() => aktiflikDegistir(k)}
                  />
                  <Dugme
                    baslik="Sil"
                    tur="sade"
                    kucuk
                    ikon="trash-outline"
                    pasif={islemde}
                    onPress={() => sil(k)}
                  />
                </>
              ) : null}
            </View>
          </Kart>
        );
      })}
    </Ekran>
  );
}

const st = StyleSheet.create({
  kartBaslik: { fontSize: 15, fontWeight: "800", color: renk.metin },
  etiket: { fontSize: 13, fontWeight: "700", color: renk.metin },

  rolSatir: { flexDirection: "row", gap: bosluk.sm },
  rolKutu: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: yuvarlak.md,
    borderWidth: 1,
    borderColor: renk.cizgi,
    backgroundColor: "#F8FAFC",
  },
  rolSecili: { backgroundColor: renk.mavi, borderColor: renk.mavi },
  rolYazi: { fontSize: 13, fontWeight: "700", color: renk.soluk },

  formAksiyon: { flexDirection: "row", gap: bosluk.sm },

  sifreKart: { backgroundColor: renk.yesilAcik, borderColor: renk.yesil, gap: bosluk.sm },
  sifreBaslik: { fontSize: 13.5, fontWeight: "700", color: renk.yesil },
  sifreKod: { fontSize: 30, fontWeight: "900", letterSpacing: 5, color: renk.metin },
  sifreNot: { fontSize: 12, color: renk.yesil },
  sifreAksiyon: { flexDirection: "row", gap: bosluk.sm },

  ust: { flexDirection: "row", alignItems: "center", gap: bosluk.md },
  ad: { fontSize: 15.5, fontWeight: "800", color: renk.metin },
  alt: { fontSize: 11.5, color: renk.soluk, marginTop: 1 },

  durumSatir: { flexDirection: "row", gap: bosluk.md, alignItems: "center" },
  durumOge: { flexDirection: "row", alignItems: "center", gap: 6 },
  isik: { width: 10, height: 10, borderRadius: 5 },
  durumYazi: { fontSize: 12.5, color: renk.soluk, fontWeight: "600" },

  aksiyonlar: { flexDirection: "row", flexWrap: "wrap", gap: bosluk.sm },
});
