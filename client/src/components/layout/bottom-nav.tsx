import { useAuth } from "@/context/auth";
import { useRealtime } from "@/context/realtime";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter, type Href } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: Record<
  string,
  { label: string; icon: IconName; iconActive: IconName }
> = {
  index: { label: "Home", icon: "home-outline", iconActive: "home" },
  explore: { label: "Explore", icon: "search-outline", iconActive: "search" },
  sell: { label: "Sell", icon: "add", iconActive: "add" },
  messages: {
    label: "Messages",
    icon: "chatbubble-ellipses-outline",
    iconActive: "chatbubble-ellipses",
  },
  evidence: {
    label: "Evidence",
    icon: "shield-checkmark-outline",
    iconActive: "shield-checkmark",
  },
};

const ACTIVE = "#2563eb";
const INACTIVE = "#434655";

export function BottomNav({ state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { unread } = useRealtime();
  const { user } = useAuth();

  // Matches the server: only sellers and admins can post listings
  const canSell = user?.role === "seller" || user?.role === "admin";

  return (
    <View
      className="flex-row border-t border-tint-200 bg-white/95"
      style={{ paddingBottom: insets.bottom }}
    >
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        if (route.name === "sell" && !canSell) return null;

        const focused = state.index === index;
        const isSell = route.name === "sell";

        const onPress = () => {
          if (!focused) {
            const href: Href =
              route.name === "index" ? "/" : (`/${route.name}` as Href);

            router.navigate(href);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityLabel={
              route.name === "messages" && unread > 0
                ? `${tab.label}, ${unread} unread`
                : tab.label
            }
            accessibilityState={{ selected: focused }}
            className={`h-16 flex-1 mx-1 items-center justify-center gap-0.5 rounded-xl ${
              focused ? "bg-primary/10" : "bg-transparent"
            }`}
          >
            {isSell ? (
              <View
                className={`h-9 w-9 items-center justify-center rounded-full shadow-md ${
                  focused ? "bg-primary-dark" : "bg-primary"
                }`}
              >
                <Ionicons name="add" size={20} color="#ffffff" />
              </View>
            ) : (
              <View>
                <Ionicons
                  name={focused ? tab.iconActive : tab.icon}
                  size={20}
                  color={focused ? ACTIVE : INACTIVE}
                />
                {route.name === "messages" && unread > 0 && (
                  <View className="absolute -right-3 -top-1.5 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-primary-dark px-1">
                    <Text className="font-sans-bold text-[9px] leading-[11px] text-white">
                      {unread > 9 ? "9+" : unread}
                    </Text>
                  </View>
                )}
              </View>
            )}
            <Text
              className={`font-sans-bold text-[11px] leading-[14px] tracking-[0.44px] ${
                focused ? "text-primary" : "text-muted"
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
