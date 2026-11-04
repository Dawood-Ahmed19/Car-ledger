import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader } from "@/components/layout/app-header";
import { ListingCard } from "@/components/listings/ListingCard";
import { toClientListing } from "@/hooks/use-listings";
import { api, ApiError } from "@/lib/api";
import type { Listing } from "@/Types";

export default function MyListingsScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ listings: Listing[] }>("/api/listings/mine");
      setListings(res.listings.map(toClientListing));
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not load your listings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

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

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  return (
    <View className="flex-1 bg-white">
      <AppHeader variant="detail" title="My listings" onBack={goBack} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(l) => l.id}
          contentContainerClassName="p-4 pb-8 grow"
          refreshing={refreshing}
          onRefresh={refresh}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={(id) => router.push(`/listing/${id}` as never)}
            />
          )}
          ItemSeparatorComponent={() => <View className="h-4" />}
          ListHeaderComponent={
            listings.length > 0 ? (
              <Text className="mb-3 px-1 text-sm text-muted">
                {listings.length}{" "}
                {listings.length === 1 ? "listing" : "listings"}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center gap-2 p-8">
              <Ionicons
                name={error ? "cloud-offline-outline" : "car-outline"}
                size={44}
                color="#94a3b8"
              />
              <Text className="font-sans-bold text-lg text-ink">
                {error ? "Could not load your listings" : "No listings yet"}
              </Text>
              <Text className="text-center text-sm text-muted">
                {error ?? "Post your first car and buyers will see it here."}
              </Text>
              <Pressable
                onPress={error ? refresh : () => router.push("/sell")}
                accessibilityRole="button"
                className="mt-3 h-11 items-center justify-center rounded-xl bg-primary px-6 active:opacity-80"
              >
                <Text className="font-sans-bold text-sm text-white">
                  {error ? "Try again" : "Post a listing"}
                </Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}
