import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ListingCard } from "@/components/listings/ListingCard";
import { EvidenceUpdateBanner } from "@/components/ui/evidenceUpdateBanner";
import type { ListingStatus } from "@/types";
import { useListings } from "@/hooks/use-listings";

type Filter = "all" | ListingStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "verified", label: "Verified" },
  { value: "under_review", label: "Under review" },
  { value: "not_checked", label: "Not yet checked" },
];

export default function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const { listings: all, loading, refreshing, error, refresh } = useListings();

  const listings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (l) =>
        l.title.toLowerCase().includes(q) &&
        (filter === "all" || l.status === filter),
    );
  }, [all, query, filter]);

  const header = (
    <View className="gap-4 pb-4">
      <View>
        <Text className="font-sans-bold text-2xl text-ink">
          Used cars with checked evidence
        </Text>
        <Text className="mt-1 text-sm text-ink/70">
          Every listing shows whether its report and photos have been checked.
        </Text>
      </View>

      {/* Shows only when a saved listing has changed since you last looked */}
      <EvidenceUpdateBanner />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search make or model"
        placeholderTextColor="#64748b"
        accessibilityLabel="Search listings"
        returnKeyType="search"
        autoCorrect={false}
        className="h-12 rounded-xl border border-tint-300 bg-white px-4 text-base text-ink"
      />

      <View className="flex-row flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => setFilter(f.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`h-11 justify-center rounded-full border px-4 ${
                active
                  ? "border-primary bg-primary"
                  : "border-tint-300 bg-white"
              }`}
            >
              <Text
                className={`font-sans-semibold text-sm ${active ? "text-white" : "text-ink"}`}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <FlatList
      className="flex-1 bg-white"
      contentContainerClassName="p-4 pb-8"
      data={listings}
      refreshing={refreshing}
      onRefresh={refresh}
      keyExtractor={(l) => l.id}
      renderItem={({ item }) => (
        <ListingCard
          listing={item}
          onPress={(id) => router.push(`/listing/${id}` as never)}
        />
      )}
      ItemSeparatorComponent={() => <View className="h-4" />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View className="items-center rounded-xl border border-tint-300 bg-white p-8">
          <Text className="font-sans-bold text-ink">
            {loading
              ? "Loading listings…"
              : error
                ? "Could not load listings."
                : "No listings match your search."}
          </Text>
          <Text className="mt-1 text-center text-sm text-ink/70">
            {error ?? "Try a different make, or clear the filter."}
          </Text>
        </View>
      }
      keyboardShouldPersistTaps="handled"
    />
  );
}
