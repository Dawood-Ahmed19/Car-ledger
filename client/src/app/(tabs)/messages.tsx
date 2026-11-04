import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import {
  ConversationCard,
  ConversationItem,
} from "@/components/messages/conversation-card";
import { useRealtime } from "@/context/realtime";

type Filter = "all" | "unread" | "buying" | "selling" | "archived";

export default function Messages() {
  const router = useRouter();
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const { subscribe } = useRealtime();

  const load = useCallback(async () => {
    try {
      setItems(await api<ConversationItem[]>("/api/conversations"));
      setError(null);
    } catch {
      setError("Couldn't load your messages. Pull down to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // reload when the tab is focused, and poll while it stays open
  useFocusEffect(
    useCallback(() => {
      load();
      const offs = [subscribe("message:new", load), subscribe("connect", load)];
      return () => offs.forEach((off) => off());
    }, [load, subscribe]),
  );

  const active = useMemo(() => items.filter((i) => !i.archived), [items]);
  const totalUnread = useMemo(
    () => active.reduce((n, i) => n + i.unreadCount, 0),
    [active],
  );
  const unreadThreads = useMemo(
    () => active.filter((i) => i.unreadCount > 0).length,
    [active],
  );

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filter === "archived") {
        if (!i.archived) return false;
      } else if (i.archived) return false;
      if (filter === "unread" && i.unreadCount === 0) return false;
      if (filter === "buying" && i.role !== "buying") return false;
      if (filter === "selling" && i.role !== "selling") return false;
      if (!q) return true;
      return (
        i.otherUser.name.toLowerCase().includes(q) ||
        i.listing.title.toLowerCase().includes(q) ||
        (i.listing.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  const chips: { key: Filter; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread", count: unreadThreads },
    { key: "buying", label: "Buying" },
    { key: "selling", label: "Selling" },
    { key: "archived", label: "Archived" },
  ];

  const Header = (
    <View className="gap-3 pb-3">
      {/* title row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-[22px] font-bold text-slate-900">Messages</Text>
          {totalUnread > 0 && (
            <View className="rounded-full bg-blue-600 px-2 py-0.5">
              <Text className="text-[11px] font-bold text-white">
                {totalUnread} New
              </Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={() => {
            setShowSearch((v) => !v);
            if (showSearch) setQuery("");
          }}
          accessibilityLabel="Search conversations"
          className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 active:bg-blue-100"
        >
          <MaterialIcons
            name={showSearch ? "close" : "search"}
            size={20}
            color="#475569"
          />
        </Pressable>
      </View>

      {/* search */}
      {showSearch && (
        <View className="justify-center">
          <MaterialIcons
            name="manage-search"
            size={18}
            color="#64748b"
            style={{ position: "absolute", left: 12, zIndex: 1 }}
          />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search by person, car, or city"
            placeholderTextColor="#64748b"
            className="rounded-xl bg-blue-50 py-2.5 pl-9 pr-4 text-sm text-slate-900"
          />
        </View>
      )}

      {/* filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {chips.map((ch) => {
          const on = filter === ch.key;
          return (
            <Pressable
              key={ch.key}
              onPress={() => setFilter(ch.key)}
              className={`flex-row items-center gap-1.5 rounded-full px-3.5 py-2 ${on ? "bg-blue-700" : "bg-slate-100"}`}
            >
              <Text
                className={`text-xs font-semibold ${on ? "text-white" : "text-slate-600"}`}
              >
                {ch.label}
              </Text>
              {!!ch.count && !on && (
                <View className="h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1">
                  <Text className="text-[10px] font-bold text-white">
                    {ch.count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* safety banner (edit the copy to what you actually enforce) */}
      <View className="flex-row gap-3 rounded-xl bg-blue-100 p-3.5">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <MaterialIcons name="verified-user" size={18} color="#fff" />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-slate-900">
            Stay safe on VeriDrive
          </Text>
          <Text className="mt-0.5 text-[13px] leading-[18px] text-slate-600">
            Check a listing’s evidence before you pay, meet in a public place,
            and never share OTPs or card PINs.
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={Header}
        renderItem={({ item }) => (
          <ConversationCard
            item={item}
            onPress={() => router.push(`/chat/${item.id}` as any)}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerClassName="p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator className="mt-12" color="#1d4ed8" />
          ) : (
            <View className="mt-14 items-center gap-2 px-6">
              <MaterialIcons
                name="chat-bubble-outline"
                size={40}
                color="#cbd5e1"
              />
              <Text className="text-center text-base font-semibold text-slate-900">
                {error ??
                  (query || filter !== "all"
                    ? "No matching conversations"
                    : "No messages yet")}
              </Text>
              {!error && filter === "all" && !query && (
                <Text className="text-center text-sm text-slate-600">
                  Tap “Message seller” on any listing to start a conversation.
                </Text>
              )}
            </View>
          )
        }
      />
    </View>
  );
}
