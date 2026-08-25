import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { bosluk, renk } from "@/lib/theme";

/** Tüm sayfalarda ortak kaydırılabilir gövde + aşağı çekip yenileme. */
export function Ekran({
  children,
  yenileniyor,
  onYenile,
}: {
  children: ReactNode;
  yenileniyor?: boolean;
  onYenile?: () => void;
}) {
  const inset = useSafeAreaInsets();
  return (
    <View style={st.kok}>
      <ScrollView
        contentContainerStyle={[
          st.icerik,
          { paddingBottom: inset.bottom + bosluk.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onYenile ? (
            <RefreshControl
              refreshing={Boolean(yenileniyor)}
              onRefresh={onYenile}
              tintColor={renk.mavi}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  kok: { flex: 1, backgroundColor: renk.arka },
  icerik: { padding: bosluk.lg, gap: bosluk.lg },
});
