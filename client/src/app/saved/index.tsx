// src/app/saved.tsx
import { AppHeader } from "@/components/layout/app-header";
import { ListingCard } from "@/components/listings/ListingCard";
import { toClientListing } from "@/hooks/use-listings";
import { api, ApiError } from "@/lib/api";
import { unsaveListing } from "@/lib/saved";
import type { Listing } from "@/Types";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";

type Change = "status" | "price";
type SavedItem = { listing: Listing; changes: Change[] };

const CHANGE_TEXT: Record<Change, string> = {
  status: "Evidence status changed",
  price: "Price changed",
};

export default function SavedScreen() {
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ saved: SavedItem[] }>("/api/saved");
      setItems(
        res.saved.map((s) => ({
          listing: toClientListing(s.listing),
          changes: s.changes,
        })),
      );
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not load saved listings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // reload every time the screen opens, so changes show up
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const remove = async (item: SavedItem) => {
    setItems((prev) => prev.filter((s) => s.listing.id !== item.listing.id)); // optimistic
    try {
      await unsaveListing(item.listing.id);
    } catch (e) {
      setItems((prev) => [item, ...prev]); // put it back
      Alert.alert(
        "Couldn't remove it",
        e instanceof ApiError ? e.message : "Try again.",
      );
    }
  };

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  return (
    <View className="flex-1 bg-white">
      <AppHeader variant="detail" title="Saved listings" onBack={goBack} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(s) => s.listing.id}
          contentContainerClassName="p-4 pb-8 grow"
          refreshing={refreshing}
          onRefresh={refresh}
          renderItem={({ item }) => (
            <View>
              {item.changes.length > 0 && (
                <View className="mb-2 flex-row flex-wrap gap-2">
                  {item.changes.map((c) => (
                    <View
                      key={c}
                      className="flex-row items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1"
                    >
                      <Ionicons name="alert-circle" size={14} color="#92400e" />
                      <Text className="font-sans-bold text-xs text-amber-900">
                        {CHANGE_TEXT[c]}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <ListingCard
                listing={item.listing}
                onPress={(id) => router.push(`/listing/${id}` as never)}
              />

              <Pressable
                onPress={() => remove(item)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.listing.title} from saved`}
                className="mt-2 h-10 flex-row items-center justify-center gap-1.5 self-end rounded-lg px-3 active:opacity-70"
              >
                <Ionicons name="bookmark" size={16} color="#2563eb" />
                <Text className="font-sans-semibold text-sm text-primary">
                  Remove
                </Text>
              </Pressable>
            </View>
          )}
          ItemSeparatorComponent={() => <View className="h-4" />}
          ListHeaderComponent={
            items.length > 0 ? (
              <Text className="mb-3 px-1 text-sm text-muted">
                {items.length} saved {items.length === 1 ? "car" : "cars"}
              </Text>
            ) : undefined
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center gap-2 p-8">
              <Ionicons
                name={error ? "cloud-offline-outline" : "bookmark-outline"}
                size={44}
                color="#94a3b8"
              />
              <Text className="font-sans-bold text-lg text-ink">
                {error ? "Could not load saved listings" : "Nothing saved yet"}
              </Text>
              <Text className="text-center text-sm text-muted">
                {error ?? "Tap the bookmark on a car to keep it here."}
              </Text>
              <Pressable
                onPress={error ? refresh : () => router.replace("/explore")}
                accessibilityRole="button"
                className="mt-3 h-11 items-center justify-center rounded-xl bg-primary px-6 active:opacity-80"
              >
                <Text className="font-sans-bold text-sm text-white">
                  {error ? "Try again" : "Browse cars"}
                </Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}
