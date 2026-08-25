import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { bosluk, renk, yuvarlak } from "@/lib/theme";

export type Magaza = { id: string; name: string };

/** Alışveriş girerken mağaza seçmek için arama kutulu liste. */
export function MagazaSecici({
  magazalar,
  secili,
  onSec,
}: {
  magazalar: Magaza[];
  secili: Magaza | null;
  onSec: (m: Magaza) => void;
}) {
  const [acik, setAcik] = useState(false);
  const [arama, setArama] = useState("");

  const suzulmus = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr");
    if (!q) return magazalar;
    return magazalar.filter((m) => m.name.toLocaleLowerCase("tr").includes(q));
  }, [magazalar, arama]);

  return (
    <>
      <View style={{ gap: 6 }}>
        <Text style={st.etiket}>Mağaza</Text>
        <Pressable style={st.secim} onPress={() => setAcik(true)}>
          <Text style={[st.secimYazi, !secili && { color: renk.soluk }]} numberOfLines={1}>
            {secili?.name ?? "Mağaza seçin"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={renk.soluk} />
        </Pressable>
      </View>

      <Modal visible={acik} animationType="slide" transparent onRequestClose={() => setAcik(false)}>
        <Pressable style={st.perde} onPress={() => setAcik(false)} />
        <View style={st.sayfa}>
          <View style={st.tutamac} />
          <Text style={st.baslik}>Mağaza seçin</Text>
          <TextInput
            value={arama}
            onChangeText={setArama}
            placeholder="Mağaza ara"
            placeholderTextColor={renk.soluk}
            style={st.arama}
            autoCorrect={false}
          />
          <FlatList
            data={suzulmus}
            keyExtractor={(m) => m.id}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={st.ayirac} />}
            ListEmptyComponent={<Text style={st.bos}>Mağaza bulunamadı.</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={st.satir}
                onPress={() => {
                  onSec(item);
                  setArama("");
                  setAcik(false);
                }}
              >
                <Text style={st.satirYazi}>{item.name}</Text>
                {secili?.id === item.id ? (
                  <Ionicons name="checkmark" size={18} color={renk.mavi} />
                ) : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  etiket: { fontSize: 13, fontWeight: "700", color: renk.metin },
  secim: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: bosluk.sm,
    borderWidth: 1,
    borderColor: renk.cizgi,
    borderRadius: yuvarlak.md,
    paddingHorizontal: bosluk.md,
    paddingVertical: 13,
    backgroundColor: "#fff",
  },
  secimYazi: { flex: 1, fontSize: 15, color: renk.metin, fontWeight: "600" },

  perde: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)" },
  sayfa: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "72%",
    backgroundColor: "#fff",
    borderTopLeftRadius: yuvarlak.xl,
    borderTopRightRadius: yuvarlak.xl,
    padding: bosluk.lg,
    gap: bosluk.md,
  },
  tutamac: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: renk.cizgi,
  },
  baslik: { fontSize: 17, fontWeight: "800", color: renk.metin },
  arama: {
    borderWidth: 1,
    borderColor: renk.cizgi,
    borderRadius: yuvarlak.md,
    paddingHorizontal: bosluk.md,
    paddingVertical: 11,
    fontSize: 15,
    color: renk.metin,
  },
  satir: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  satirYazi: { fontSize: 15, color: renk.metin, fontWeight: "600" },
  ayirac: { height: 1, backgroundColor: renk.cizgi },
  bos: { color: renk.soluk, paddingVertical: bosluk.xl, textAlign: "center" },
});
