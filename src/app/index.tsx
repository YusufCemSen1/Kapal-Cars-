import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { renk } from "@/lib/theme";

/** Açılış ekranı — useRolYonlendirme doğru bölüme aktarır. */
export default function Acilis() {
  return (
    <View style={st.kok}>
      <Text style={st.logo}>ORTACI+</Text>
      <ActivityIndicator color={renk.mavi} />
    </View>
  );
}

const st = StyleSheet.create({
  kok: {
    flex: 1,
    backgroundColor: renk.lacivert,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  logo: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 3 },
});
