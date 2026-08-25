import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { UstBar } from "@/components/UstBar";
import { renk } from "@/lib/theme";

export default function SoforDuzen() {
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Müşteri Bildir",
          tabBarLabel: "Bildir",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="megaphone" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="turlar"
        options={{
          title: "Turlarım",
          tabBarLabel: "Turlarım",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
