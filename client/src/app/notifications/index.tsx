import { useRealtime } from "@/context/realtime";
import { setNotificationCount } from "@/hooks/use-notification-count";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Item = {
  id: string;
  type: "scam" | "evidence" | "listing";
  title: string;
  body: string;
  data: { conversationId?: string; listingId?: string } | null;
  createdAt: string;
  read: boolean;
};

const ICON = {
  scam: { name: "warning-outline", color: "#dc2626", bg: "bg-red-50" },
  evidence: {
    name: "shield-checkmark-outline",
    color: "#2563eb",
    bg: "bg-blue-50",
  },
  listing: { name: "car-outline", color: "#2563eb", bg: "bg-blue-50" },
} as const;

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Notifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { subscribe } = useRealtime();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ unread: number; items: Item[] }>(
        "/api/notifications",
      );
      setItems(r.items);
      setNotificationCount(r.unread);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // new notifications appear at the top while the screen is open
  useEffect(
    () =>
      subscribe("notification:new", (p: { notification: Item }) =>
        setItems((prev) =>
          prev.some((i) => i.id === p.notification.id)
            ? prev
            : [p.notification, ...prev],
        ),
      ),
    [subscribe],
  );

  const unread = items.filter((i) => !i.read).length;

  const open = async (n: Item) => {
    if (!n.read) {
      setItems((prev) =>
        prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)),
      );
      setNotificationCount(unread - 1);
      api(`/api/notifications/${n.id}/read`, { method: "POST" }).catch(
        () => {},
      );
    }
    if (n.data?.conversationId)
      router.push(`/chat/${n.data.conversationId}` as any);
    else if (n.data?.listingId)
      router.push(`/listing/${n.data.listingId}` as any);
  };

  const markAll = async () => {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setNotificationCount(0);
    api("/api/notifications/read-all", { method: "POST" }).catch(() => {});
  };

  return (
    <View className="flex-1 bg-slate-50">
      <View
        className="flex-row items-center gap-2 border-b border-slate-100 bg-white px-3 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
          accessibilityLabel="Go back"
          className="h-11 w-11 items-center justify-center rounded-lg active:bg-blue-50"
        >
          <Ionicons name="arrow-back" size={24} color="#0b1c30" />
        </Pressable>
        <Text className="flex-1 text-lg font-semibold text-slate-900">
          Notifications
        </Text>
        {unread > 0 ? (
          <Pressable
            onPress={markAll}
            className="rounded-lg px-3 py-2 active:bg-blue-50"
          >
            <Text className="text-[13px] font-semibold text-blue-600">
              Mark all read
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 24,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8">
              <Ionicons
                name={
                  error ? "cloud-offline-outline" : "notifications-off-outline"
                }
                size={40}
                color="#94a3b8"
              />
              <Text className="mt-3 text-center text-[15px] font-semibold text-slate-700">
                {error ? "Couldn't load notifications" : "No notifications yet"}
              </Text>
              <Text className="mt-1 text-center text-[13px] text-slate-500">
                {error
                  ? "Pull down to try again."
                  : "Safety warnings and listing updates will show up here."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const ic = ICON[item.type] ?? ICON.listing;
            return (
              <Pressable
                onPress={() => open(item)}
                className={`flex-row gap-3 rounded-xl p-3 active:bg-blue-50 ${item.read ? "bg-white" : "bg-blue-50/60"}`}
              >
                <View
                  className={`h-10 w-10 items-center justify-center rounded-lg ${ic.bg}`}
                >
                  <Ionicons name={ic.name} size={20} color={ic.color} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text
                      className="flex-1 text-[15px] font-semibold text-slate-900"
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {!item.read ? (
                      <View className="h-2 w-2 rounded-full bg-blue-600" />
                    ) : null}
                  </View>
                  <Text
                    className="mt-0.5 text-[13px] text-slate-600"
                    numberOfLines={3}
                  >
                    {item.body}
                  </Text>
                  <Text className="mt-1 text-[11px] text-slate-400">
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
