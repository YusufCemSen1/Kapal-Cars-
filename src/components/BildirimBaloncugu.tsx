import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBildirim } from "@/lib/bildirim";
import { bosluk, golge, renk, yuvarlak } from "@/lib/theme";

const ikonlar: Record<string, keyof typeof Ionicons.glyphMap> = {
  yeni_tur: "people",
  atandi: "person-add",
  alindi: "walk",
  satis: "cart",
  tamamlandi: "checkmark-done",
  iptal: "close-circle",
};

/** Ekranın üstünde beliren canlı bildirim şeridi. */
export function BildirimBaloncugu() {
  const { sonBildirim, bildirimiKapat } = useBildirim();
  const inset = useSafeAreaInsets();
  const router = useRouter();
  const kayma = useRef(new Animated.Value(-140)).current;

  useEffect(() => {
    Animated.spring(kayma, {
      toValue: sonBildirim ? 0 : -140,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  }, [sonBildirim, kayma]);

  if (!sonBildirim) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        st.sarmal,
        { top: inset.top + 6, transform: [{ translateY: kayma }] },
      ]}
    >
      <Pressable
        style={st.kutu}
        onPress={() => {
          bildirimiKapat();
          router.push("/bildirimler");
        }}
      >
        <View style={st.ikon}>
          <Ionicons
            name={ikonlar[sonBildirim.type] ?? "notifications"}
            size={18}
            color="#fff"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.baslik}>{sonBildirim.title}</Text>
          <Text style={st.govde} numberOfLines={2}>
            {sonBildirim.body}
          </Text>
        </View>
        <Pressable onPress={bildirimiKapat} hitSlop={12}>
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  sarmal: { position: "absolute", left: 0, right: 0, zIndex: 50, paddingHorizontal: bosluk.md },
  kutu: {
    flexDirection: "row",
    alignItems: "center",
    gap: bosluk.md,
    backgroundColor: renk.lacivert,
    borderRadius: yuvarlak.lg,
    padding: bosluk.md,
    ...golge,
    shadowOpacity: 0.25,
  },
  ikon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: renk.mavi,
    alignItems: "center",
    justifyContent: "center",
  },
  baslik: { color: "#fff", fontWeight: "800", fontSize: 14 },
  govde: { color: "rgba(255,255,255,0.75)", fontSize: 12.5, marginTop: 1 },
});
