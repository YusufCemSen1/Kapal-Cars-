import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BildirimBaloncugu } from "@/components/BildirimBaloncugu";
import { AuthProvider, useRolYonlendirme } from "@/lib/auth";
import { BildirimProvider } from "@/lib/bildirim";
import { renk } from "@/lib/theme";

function Yonlendirici() {
  useRolYonlendirme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: renk.lacivert },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "800" },
        contentStyle: { backgroundColor: renk.arka },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="giris" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      <Stack.Screen name="(sofor)" options={{ headerShown: false }} />
      <Stack.Screen name="(ortaci)" options={{ headerShown: false }} />
      <Stack.Screen
        name="bildirimler"
        options={{ title: "Bildirimler", presentation: "modal" }}
      />
    </Stack>
  );
}

export default function KokDuzen() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <BildirimProvider>
            <StatusBar style="light" />
            <Yonlendirici />
            <BildirimBaloncugu />
          </BildirimProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
