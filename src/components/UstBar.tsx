import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { useBildirim } from "@/lib/bildirim";
import { renk } from "@/lib/theme";

/** Başlık sağındaki zil + çıkış düğmeleri. */
export function UstBar() {
  const router = useRouter();
  const { cikisYap } = useAuth();
  const { okunmamis } = useBildirim();

  function cikisSor() {
    const onayla = () => void cikisYap();
    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (window.confirm("Oturumu kapatmak istiyor musunuz?")) onayla();
      return;
    }
    Alert.alert("Çıkış", "Oturumu kapatmak istiyor musunuz?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış yap", style: "destructive", onPress: onayla },
    ]);
  }

  return (
    <View style={st.kok}>
      <Pressable onPress={() => router.push("/bildirimler")} hitSlop={8}>
        <Ionicons name="notifications-outline" size={23} color="#fff" />
        {okunmamis > 0 ? (
          <View style={st.nokta}>
            <Text style={st.noktaYazi}>{okunmamis > 9 ? "9+" : okunmamis}</Text>
          </View>
        ) : null}
      </Pressable>
      <Pressable onPress={cikisSor} hitSlop={8}>
        <Ionicons name="log-out-outline" size={23} color="rgba(255,255,255,0.75)" />
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  kok: { flexDirection: "row", alignItems: "center", gap: 18, paddingRight: 4 },
  nokta: {
    position: "absolute",
    right: -6,
    top: -4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: renk.kirmizi,
    alignItems: "center",
    justifyContent: "center",
  },
  noktaYazi: { color: "#fff", fontSize: 10, fontWeight: "800" },
});
