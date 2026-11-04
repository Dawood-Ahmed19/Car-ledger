import { Tabs } from "expo-router";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MainHeader } from "@/components/layout/main-header";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{
        headerShown: true,
        header: () => <MainHeader />,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="sell" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="evidence" />
    </Tabs>
  );
}
