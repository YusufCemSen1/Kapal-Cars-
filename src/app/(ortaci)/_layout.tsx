import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { UstBar } from "@/components/UstBar";
import { renk } from "@/lib/theme";

export default function OrtaciDuzen() {
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
          title: "Ortacı Paneli",
          tabBarLabel: "Panel",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="walk" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gecmis"
        options={{
          title: "Geçmiş",
          tabBarLabel: "Geçmiş",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
