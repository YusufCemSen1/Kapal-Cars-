import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dugme, Uyari } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { isConfigured } from "@/lib/supabase";
import { bosluk, renk, yuvarlak } from "@/lib/theme";

export default function Giris() {
  const { girisYap } = useAuth();
  const inset = useSafeAreaInsets();
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [sifre, setSifre] = useState("");
  const [gizli, setGizli] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function gonder() {
    if (yukleniyor) return;
    setHata(null);
    if (!kullaniciAdi.trim()) {
      setHata("Kullanıcı adınızı girin.");
      return;
    }
    if (sifre.trim().length < 4) {
      setHata("Şifrenizi eksiksiz girin.");
      return;
    }
    setYukleniyor(true);
    try {
      await girisYap(kullaniciAdi.trim().toLowerCase(), sifre.trim());
      setSifre("");
    } catch (e) {
      setHata((e as Error).message);
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={st.kok}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[st.icerik, { paddingTop: inset.top + 60 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={st.rozet}>
          <Ionicons name="storefront" size={26} color="#fff" />
        </View>
        <Text style={st.logo}>ORTACI+</Text>
        <Text style={st.altYazi}>Şoför · Ortacı · Yönetim</Text>

        <View style={st.kart}>
          <Text style={st.etiket}>Kullanıcı adınız</Text>
          <View style={st.girdiSarmal}>
            <Ionicons name="person-outline" size={19} color={renk.soluk} />
            <TextInput
              value={kullaniciAdi}
              onChangeText={setKullaniciAdi}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              placeholder="kullanici.adi"
              placeholderTextColor="#94A3B8"
              style={st.girdiAd}
              returnKeyType="next"
            />
          </View>

          <Text style={st.etiket}>Kişisel şifreniz</Text>
          <View style={st.girdiSarmal}>
            <TextInput
              value={sifre}
              onChangeText={setSifre}
              secureTextEntry={gizli}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              style={st.girdi}
              onSubmitEditing={gonder}
              returnKeyType="go"
            />
            <Pressable onPress={() => setGizli((g) => !g)} hitSlop={10}>
              <Ionicons
                name={gizli ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={renk.soluk}
              />
            </Pressable>
          </View>

          {!isConfigured ? (
            <Uyari
              tur="bilgi"
              metin="Sunucu ayarları eksik. .env dosyasına EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY değerlerini girin."
            />
          ) : null}
          {hata ? <Uyari metin={hata} /> : null}

          <Dugme
            baslik="Giriş yap"
            onPress={gonder}
            yukleniyor={yukleniyor}
            pasif={!isConfigured}
            ikon="log-in-outline"
            tam
          />
        </View>

        <Text style={st.dipnot}>
          Hesaplar yönetici tarafından oluşturulur. Şifrenizi kimseyle paylaşmayın.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  kok: { flex: 1, backgroundColor: renk.lacivert },
  icerik: { padding: bosluk.xl, alignItems: "center", gap: bosluk.md },
  rozet: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: renk.mavi,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 3,
    marginTop: bosluk.sm,
  },
  altYazi: { color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: bosluk.xl },
  kart: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: yuvarlak.xl,
    padding: bosluk.xl,
    gap: bosluk.md,
  },
  etiket: { fontSize: 13, fontWeight: "700", color: renk.metin },
  girdiSarmal: {
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.sm,
    borderWidth: 1,
    borderColor: renk.cizgi,
    borderRadius: yuvarlak.md,
    paddingHorizontal: bosluk.md,
  },
  girdi: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    letterSpacing: 3,
    color: renk.metin,
  },
  girdiAd: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: renk.metin,
  },
  dipnot: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    textAlign: "center",
    maxWidth: 320,
    marginTop: bosluk.lg,
  },
});
