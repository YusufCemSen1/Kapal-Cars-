import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { bosluk, golge, renk, yuvarlak } from "@/lib/theme";

/* ------------------------------------------------------------------ Başlık */
export function Baslik({
  ust,
  children,
  sag,
}: {
  ust?: string;
  children: ReactNode;
  sag?: ReactNode;
}) {
  return (
    <View style={s.baslikSatir}>
      <View style={{ flex: 1 }}>
        {ust ? <Text style={s.baslikUst}>{ust}</Text> : null}
        <Text style={s.baslik}>{children}</Text>
      </View>
      {sag}
    </View>
  );
}

/* -------------------------------------------------------------------- Kart */
export function Kart({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [s.kart, style, pressed && { opacity: 0.7 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[s.kart, style]}>{children}</View>;
}

/* ------------------------------------------------------------------- Düğme */
type DugmeTuru = "birincil" | "ikincil" | "yesil" | "kirmizi" | "sade";

export function Dugme({
  baslik,
  onPress,
  tur = "birincil",
  ikon,
  yukleniyor,
  pasif,
  tam,
  kucuk,
  style,
}: {
  baslik: string;
  onPress: () => void;
  tur?: DugmeTuru;
  ikon?: keyof typeof Ionicons.glyphMap;
  yukleniyor?: boolean;
  pasif?: boolean;
  tam?: boolean;
  kucuk?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const renkler: Record<DugmeTuru, { bg: string; fg: string; kenar?: string }> = {
    birincil: { bg: renk.mavi, fg: "#fff" },
    ikincil: { bg: renk.maviAcik, fg: renk.mavi },
    yesil: { bg: renk.yesil, fg: "#fff" },
    kirmizi: { bg: renk.kirmizi, fg: "#fff" },
    sade: { bg: "transparent", fg: renk.soluk, kenar: renk.cizgi },
  };
  const c = renkler[tur];
  const kapali = pasif || yukleniyor;

  return (
    <Pressable
      onPress={onPress}
      disabled={kapali}
      style={({ pressed }) => [
        s.dugme,
        {
          backgroundColor: c.bg,
          borderColor: c.kenar ?? "transparent",
          borderWidth: c.kenar ? 1 : 0,
          paddingVertical: kucuk ? 9 : 14,
          paddingHorizontal: kucuk ? 12 : 18,
          alignSelf: tam ? "stretch" : "flex-start",
          opacity: kapali ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {yukleniyor ? (
        <ActivityIndicator color={c.fg} size="small" />
      ) : (
        <>
          {ikon ? (
            <Ionicons name={ikon} size={kucuk ? 15 : 18} color={c.fg} />
          ) : null}
          <Text
            style={[s.dugmeYazi, { color: c.fg, fontSize: kucuk ? 13 : 15 }]}
          >
            {baslik}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------- Rozet */
export function Rozet({
  metin,
  bg,
  fg,
}: {
  metin: string;
  bg: string;
  fg: string;
}) {
  return (
    <View style={[s.rozet, { backgroundColor: bg }]}>
      <Text style={[s.rozetYazi, { color: fg }]}>{metin}</Text>
    </View>
  );
}

/* -------------------------------------------------------------- Metin alanı */
export function Alan({
  etiket,
  ipucu,
  ...props
}: TextInputProps & { etiket?: string; ipucu?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {etiket ? <Text style={s.etiket}>{etiket}</Text> : null}
      <TextInput
        placeholderTextColor={renk.soluk}
        {...props}
        style={[s.girdi, props.style]}
      />
      {ipucu ? <Text style={s.ipucu}>{ipucu}</Text> : null}
    </View>
  );
}

/* --------------------------------------------------------------- İstatistik */
export function Istatistik({
  etiket,
  deger,
  vurgu,
  ikon,
}: {
  etiket: string;
  deger: string;
  vurgu?: string;
  ikon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={s.istatistik}>
      <View style={s.istatistikUst}>
        {ikon ? <Ionicons name={ikon} size={14} color={renk.soluk} /> : null}
        <Text style={s.istatistikEtiket}>{etiket}</Text>
      </View>
      <Text style={[s.istatistikDeger, vurgu ? { color: vurgu } : null]}>
        {deger}
      </Text>
    </View>
  );
}

/* --------------------------------------------------------------- Boş durum */
export function Bos({
  ikon = "file-tray-outline",
  baslik,
  aciklama,
}: {
  ikon?: keyof typeof Ionicons.glyphMap;
  baslik: string;
  aciklama?: string;
}) {
  return (
    <View style={s.bos}>
      <Ionicons name={ikon} size={38} color={renk.cizgi} />
      <Text style={s.bosBaslik}>{baslik}</Text>
      {aciklama ? <Text style={s.bosAciklama}>{aciklama}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------ Satır (etiket/değer) */
export function Satir({
  etiket,
  deger,
  kalin,
  renkli,
}: {
  etiket: string;
  deger: string;
  kalin?: boolean;
  renkli?: string;
}) {
  return (
    <View style={s.satir}>
      <Text style={s.satirEtiket}>{etiket}</Text>
      <Text
        style={[
          s.satirDeger,
          kalin && { fontWeight: "700" },
          renkli ? { color: renkli } : null,
        ]}
      >
        {deger}
      </Text>
    </View>
  );
}

export function Uyari({ metin, tur = "hata" }: { metin: string; tur?: "hata" | "bilgi" }) {
  const c =
    tur === "hata"
      ? { bg: renk.kirmiziAcik, fg: renk.kirmizi, ikon: "alert-circle" as const }
      : { bg: renk.maviAcik, fg: renk.mavi, ikon: "information-circle" as const };
  return (
    <View style={[s.uyari, { backgroundColor: c.bg }]}>
      <Ionicons name={c.ikon} size={17} color={c.fg} />
      <Text style={[s.uyariYazi, { color: c.fg }]}>{metin}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  baslikSatir: {
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.md,
    marginBottom: bosluk.lg,
  },
  baslikUst: {
    color: renk.soluk,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  baslik: { color: renk.metin, fontSize: 24, fontWeight: "800" },

  kart: {
    backgroundColor: renk.kart,
    borderRadius: yuvarlak.lg,
    padding: bosluk.lg,
    borderWidth: 1,
    borderColor: renk.cizgi,
    ...golge,
  },

  dugme: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: yuvarlak.md,
  },
  dugmeYazi: { fontWeight: "700" },

  rozet: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  rozetYazi: { fontSize: 12, fontWeight: "700" },

  etiket: { color: renk.metin, fontSize: 13, fontWeight: "700" },
  ipucu: { color: renk.soluk, fontSize: 12 },
  girdi: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: renk.cizgi,
    borderRadius: yuvarlak.md,
    paddingHorizontal: bosluk.md,
    paddingVertical: 13,
    fontSize: 16,
    color: renk.metin,
  },

  istatistik: {
    flex: 1,
    minWidth: 120,
    backgroundColor: renk.kart,
    borderRadius: yuvarlak.md,
    borderWidth: 1,
    borderColor: renk.cizgi,
    padding: bosluk.md,
    gap: 6,
  },
  istatistikUst: { flexDirection: "row", alignItems: "center", gap: 5 },
  istatistikEtiket: { color: renk.soluk, fontSize: 12, fontWeight: "600" },
  istatistikDeger: { color: renk.metin, fontSize: 19, fontWeight: "800" },

  bos: { alignItems: "center", gap: 6, paddingVertical: bosluk.xxl },
  bosBaslik: { color: renk.metin, fontSize: 15, fontWeight: "700" },
  bosAciklama: {
    color: renk.soluk,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: bosluk.xl,
  },

  satir: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    gap: bosluk.md,
  },
  satirEtiket: { color: renk.soluk, fontSize: 13 },
  satirDeger: { color: renk.metin, fontSize: 14, fontWeight: "600" },

  uyari: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: bosluk.md,
    borderRadius: yuvarlak.md,
  },
  uyariYazi: { flex: 1, fontSize: 13, fontWeight: "600" },
});
