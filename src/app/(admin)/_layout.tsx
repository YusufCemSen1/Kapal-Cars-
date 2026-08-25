import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { UstBar } from "@/components/UstBar";
import { renk } from "@/lib/theme";

export default function AdminDuzen() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: renk.lacivert },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "800" },
        headerRight: () => <UstBar />,
        tabBarActiveTintColor: renk.mavi,
        tabBarInactiveTintColor: renk.soluk,
        tabBarStyle: { borderTopColor: renk.cizgi },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Canlı Durum",
          tabBarLabel: "Canlı",
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="turlar"
        options={{
          title: "Turlar",
          tabBarLabel: "Turlar",
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rapor"
        options={{
          title: "Raporlar",
          tabBarLabel: "Rapor",
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="kullanicilar"
        options={{
          title: "Kullanıcılar",
          tabBarLabel: "Kişiler",
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ayarlar"
        options={{
          title: "Ayarlar",
          tabBarLabel: "Ayarlar",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="magazalar" options={{ title: "Mağazalar", href: null }} />
    </Tabs>
  );
}
