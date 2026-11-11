import { useNotificationCount } from "@/hooks/use-notification-count";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

export function NotificationBell({ color = "#434655" }: { color?: string }) {
  const router = useRouter();
  const n = useNotificationCount();

  return (
    <Pressable
      onPress={() => router.push("/notifications" as any)}
      accessibilityRole="button"
      accessibilityLabel={
        n > 0 ? `Notifications, ${n} unread` : "Notifications"
      }
      className="h-10 w-10 items-center justify-center rounded-full active:bg-blue-50"
    >
      <Ionicons name="notifications-outline" size={22} color={color} />
      {n > 0 ? (
        <View className="absolute right-0.5 top-0.5 min-w-[18px] items-center rounded-full bg-red-600 px-1 py-px">
          <Text className="text-[10px] font-bold text-white">
            {n > 9 ? "9+" : n}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
