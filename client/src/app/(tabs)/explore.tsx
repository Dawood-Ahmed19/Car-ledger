import {
  BODY_TYPES,
  bodyTypeLabel,
  fuelTypeLabel,
  type IconName,
} from "@/constants/vehicle";
import { api, ApiError, assetUrl } from "@/lib/api";
import { saveListing, unsaveListing } from "@/lib/saved";
import type { Listing } from "@/types";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

/* ---------- API endpoints ---------- */

const LISTINGS_ENDPOINT = "/api/listings";
const listingRoute = (id: string) => `/listing/${id}`;

/* ---------- Colors ---------- */

const COLOR = {
  primary: "#004ac6",
  primaryContainer: "#2563eb",
  tertiary: "#006242",
  onSurfaceVariant: "#434655",
  outline: "#737686",
  secondary: "#565e74",
  error: "#ba1a1a",
};

/* ---------- Categories ---------- */

const CATEGORIES: {
  key: string;
  label: string;
  icon: IconName;
}[] = [
  { key: "all", label: "All", icon: "grid-view" },
  ...BODY_TYPES.map((body) => ({
    key: body.key as string,
    label: body.label,
    icon: body.icon,
  })),
  { key: "ev", label: "Hybrid & EV", icon: "bolt" },
];

/* ---------- Quick filters ---------- */

const QUICK_FILTERS: {
  key: string;
  label: string;
  icon: IconName;
  color: string;
}[] = [
  {
    key: "under30",
    label: "Under 30 lakh",
    icon: "price-check",
    color: COLOR.tertiary,
  },
  {
    key: "clean",
    label: "Clean Audit Only",
    icon: "fact-check",
    color: COLOR.primary,
  },
  {
    key: "lowKm",
    label: "Low Mileage (<50k km)",
    icon: "speed",
    color: COLOR.secondary,
  },
];

/* ---------- Audit badges ---------- */

const AUDIT_BADGE: Record<
  string,
  {
    label: string;
    icon: IconName;
    color: string;
    bg: string;
  }
> = {
  verified: {
    label: "Verified",
    icon: "verified",
    color: COLOR.tertiary,
    bg: "bg-[#006242]/10",
  },
  under_review: {
    label: "Under Review",
    icon: "pending-actions",
    color: COLOR.secondary,
    bg: "bg-[#dae2fd]",
  },
  not_checked: {
    label: "Not Checked",
    icon: "pending-actions",
    color: COLOR.secondary,
    bg: "bg-[#dae2fd]",
  },
  recalled: {
    label: "Recalled",
    icon: "warning",
    color: COLOR.error,
    bg: "bg-[#ba1a1a]/10",
  },
};

/* ---------- Helpers ---------- */

const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function matchesCategory(item: Listing, category: string) {
  if (category === "all") return true;

  const fuel = (item.fuelType ?? "").toLowerCase();
  const body = (item.bodyType ?? "").toLowerCase();

  if (category === "ev") {
    return fuel === "hybrid" || fuel === "electric";
  }

  return body === category.toLowerCase();
}

/* ---------- Small components ---------- */

function Chip({
  label,
  icon,
  iconColor,
  active,
  onPress,
  rounded = "rounded-full",
}: {
  label: string;
  icon: IconName;
  iconColor?: string;
  active: boolean;
  onPress: () => void;
  rounded?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`flex-row items-center gap-1.5 px-3.5 py-1.5 ${rounded} shadow-sm ${
        active ? "bg-[#004ac6]" : "bg-white"
      }`}
    >
      <MaterialIcons
        name={icon}
        size={16}
        color={active ? "#ffffff" : (iconColor ?? COLOR.onSurfaceVariant)}
      />

      <Text
        className={`text-xs font-semibold ${
          active ? "text-white" : "text-[#434655]"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="px-4 pt-3 pb-1">
      <Text className="text-[18px] font-semibold text-[#0b1c30]">{title}</Text>
    </View>
  );
}

/* ---------- Vehicle card ---------- */

function VehicleCard({
  item,
  featured = false,
  onOpen,
  onSave,
}: {
  item: Listing;
  featured?: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  const { width } = useWindowDimensions();

  const imagePath = item.imageUrl ?? item.photos?.[0];
  const image = imagePath ? assetUrl(imagePath) : undefined;
  const audit = AUDIT_BADGE[item.status];
  const tier = item.sellerTier;

  const specs = [
    ["Mileage", item.mileageLabel],
    ["Body", bodyTypeLabel(item.bodyType ?? undefined)],
    ["Fuel", fuelTypeLabel(item.fuelType ?? undefined)],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  return (
    <Pressable
      onPress={onOpen}
      style={featured ? { width: Math.min(width * 0.84, 340) } : undefined}
      className="bg-white rounded-xl shadow-sm overflow-hidden"
    >
      {/* Vehicle image */}
      <View className={`w-full bg-[#dce9ff] ${featured ? "h-44" : "h-48"}`}>
        {image ? (
          <Image
            source={{ uri: image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <MaterialIcons
              name="directions-car"
              size={40}
              color={COLOR.outline}
            />
          </View>
        )}

        {/* Save button */}
        <Pressable
          onPress={onSave}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            item.isSaved ? "Remove from saved" : "Save listing"
          }
          className="absolute top-2.5 right-2.5 h-8 w-8 items-center justify-center rounded-full bg-white/80"
        >
          <MaterialIcons
            name={item.isSaved ? "favorite" : "favorite-border"}
            size={18}
            color={item.isSaved ? COLOR.error : COLOR.onSurfaceVariant}
          />
        </Pressable>

        {/* Seller tier (shown only when the backend provides one) */}
        {tier ? (
          <View className="absolute bottom-2.5 left-2.5 flex-row items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/90">
            <MaterialIcons
              name="verified"
              size={14}
              color={tier === "gold" ? COLOR.tertiary : COLOR.primary}
            />

            <Text className="text-[11px] font-bold text-[#0b1c30]">
              {cap(tier)} Trustee Seller
            </Text>
          </View>
        ) : null}
      </View>

      {/* Vehicle information */}
      <View className="p-4 gap-3">
        <View>
          {(audit || item.city) && (
            <View className="flex-row items-center justify-between gap-2 mb-1.5">
              {audit ? (
                <View
                  className={`flex-row items-center gap-1 px-2 py-0.5 rounded ${audit.bg}`}
                >
                  <MaterialIcons
                    name={audit.icon}
                    size={13}
                    color={audit.color}
                  />

                  <Text
                    style={{ color: audit.color }}
                    className="text-[11px] font-bold"
                  >
                    {audit.label}
                  </Text>
                </View>
              ) : (
                <View />
              )}

              {item.city ? (
                <View className="flex-row items-center gap-0.5">
                  <MaterialIcons
                    name="location-on"
                    size={13}
                    color={COLOR.primary}
                  />

                  <Text className="text-[11px] font-bold text-[#434655]">
                    {item.city}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          <Text
            numberOfLines={1}
            className="text-[15px] font-semibold text-[#0b1c30]"
          >
            {item.title}
          </Text>

          <Text className="text-[20px] font-bold text-[#004ac6] mt-0.5">
            {item.priceLabel}
          </Text>
        </View>

        {/* Vehicle specs */}
        {specs.length > 0 ? (
          <View className="flex-row gap-2">
            {specs.map(([label, value]) => (
              <View
                key={label}
                className="flex-1 bg-[#eff4ff] p-2 rounded items-center"
              >
                <Text className="text-[11px] font-bold text-[#434655] uppercase">
                  {label}
                </Text>

                <Text
                  numberOfLines={1}
                  className="text-xs font-semibold text-[#0b1c30]"
                >
                  {value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Action */}
        <View className="flex-row justify-end pt-1">
          <Pressable
            onPress={onOpen}
            className="px-3.5 py-1.5 rounded-lg bg-[#2563eb]"
          >
            <Text className="text-xs font-semibold text-white">View Audit</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

/* ---------- Explore screen ---------- */

export default function Explore() {
  const router = useRouter();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [quick, setQuick] = useState<Set<string>>(new Set());

  /* ---------- Load listings ---------- */

  const hasLoaded = useRef(false);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "silent" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else if (mode === "initial") setLoading(true);
      if (mode !== "silent") setError(null);

      try {
        const data = await api<{ listings: Listing[] }>(LISTINGS_ENDPOINT);
        setListings(data.listings ?? []);
        hasLoaded.current = true;
      } catch (e: unknown) {
        if (mode !== "silent") {
          setError(e instanceof Error ? e.message : "Couldn't load vehicles.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // Spinner on the first load only; later focuses refresh in the background.
  useFocusEffect(
    useCallback(() => {
      load(hasLoaded.current ? "silent" : "initial");
    }, [load]),
  );

  /* ---------- Filters ---------- */

  const toggleQuick = (key: string) => {
    setQuick((previous) => {
      const next = new Set(previous);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  /* ---------- Save / unsave ---------- */

  const saving = useRef(new Set<string>());

  const toggleSave = async (item: Listing) => {
    if (saving.current.has(item.id)) return; // ignore taps while a request runs
    saving.current.add(item.id);

    const next = !item.isSaved;
    const patch = (value: boolean) =>
      setListings((prev) =>
        prev.map((l) => (l.id === item.id ? { ...l, isSaved: value } : l)),
      );

    patch(next); // optimistic
    try {
      await (next ? saveListing(item.id) : unsaveListing(item.id));
    } catch (e) {
      patch(!next); // revert on failure
      Alert.alert(
        "Couldn't update saved listings",
        e instanceof ApiError ? e.message : "Try again.",
      );
    } finally {
      saving.current.delete(item.id);
    }
  };

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return listings.filter((item) => {
      if (search) {
        const haystack = [item.title, item.city]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(search)) return false;
      }

      if (!matchesCategory(item, category)) return false;

      // A missing number counts as "doesn't match", so bad data is visible
      // instead of the filter silently doing nothing.
      if (
        quick.has("under30") &&
        !(typeof item.price === "number" && item.price < 3_000_000)
      )
        return false;
      if (quick.has("clean") && item.status !== "verified") return false;
      if (
        quick.has("lowKm") &&
        !(typeof item.mileageKm === "number" && item.mileageKm < 50_000)
      )
        return false;

      return true;
    });
  }, [listings, query, category, quick]);

  /* ---------- Featured listings ---------- */

  const featured = useMemo(
    () => filtered.filter((item) => item.status === "verified").slice(0, 6),
    [filtered],
  );

  const featuredIds = useMemo(
    () => new Set(featured.map((item) => item.id)),
    [featured],
  );

  const feed = useMemo(
    () => filtered.filter((item) => !featuredIds.has(item.id)),
    [filtered, featuredIds],
  );

  const open = (id: string) => {
    router.push(listingRoute(id) as any);
  };

  /* ---------- Render ---------- */

  return (
    <ScrollView
      className="flex-1 bg-[#f8f9ff]"
      contentContainerStyle={{ paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load("refresh")}
        />
      }
    >
      {/* Search */}
      <View className="px-4 pt-3 pb-2">
        <View className="bg-white p-2 rounded-xl shadow-sm flex-row items-center gap-2">
          <MaterialIcons
            name="search"
            size={22}
            color={COLOR.primary}
            style={{ marginLeft: 4 }}
          />

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search make, model, or city"
            placeholderTextColor={COLOR.outline}
            accessibilityLabel="Search listings"
            returnKeyType="search"
            autoCorrect={false}
            className="flex-1 text-[13px] text-[#0b1c30] py-1"
          />

          {query ? (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <MaterialIcons name="close" size={20} color={COLOR.outline} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Body type categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 4,
          gap: 8,
        }}
      >
        {CATEGORIES.map((item) => (
          <Chip
            key={item.key}
            label={item.label}
            icon={item.icon}
            active={category === item.key}
            onPress={() => setCategory(item.key)}
          />
        ))}
      </ScrollView>

      {/* Quick filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          gap: 8,
        }}
      >
        {QUICK_FILTERS.map((item) => (
          <Chip
            key={item.key}
            label={item.label}
            icon={item.icon}
            iconColor={item.color}
            active={quick.has(item.key)}
            onPress={() => toggleQuick(item.key)}
            rounded="rounded-lg"
          />
        ))}
      </ScrollView>

      {/* A failed refresh keeps the list and shows a retry strip */}
      {error && listings.length > 0 ? (
        <Pressable
          onPress={() => load("refresh")}
          accessibilityRole="button"
          className="mx-4 mb-2 flex-row items-center gap-2 rounded-lg bg-[#ba1a1a]/10 px-3 py-2"
        >
          <MaterialIcons name="error-outline" size={16} color={COLOR.error} />
          <Text className="flex-1 text-xs text-[#ba1a1a]">
            Couldn't refresh. Tap to try again.
          </Text>
        </Pressable>
      ) : null}

      {loading ? (
        <View className="py-20 items-center">
          <ActivityIndicator size="large" color={COLOR.primaryContainer} />
        </View>
      ) : error && listings.length === 0 ? (
        <View className="py-16 px-8 items-center gap-3">
          <MaterialIcons name="error-outline" size={36} color={COLOR.error} />

          <Text className="text-center text-[14px] text-[#434655]">
            {error}
          </Text>

          <Pressable
            onPress={() => load()}
            className="px-4 py-2 rounded-lg bg-[#2563eb]"
          >
            <Text className="text-xs font-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View className="py-16 px-8 items-center gap-2">
          <MaterialIcons name="search-off" size={36} color={COLOR.outline} />

          <Text className="text-[16px] font-semibold text-[#0b1c30]">
            No vehicles found
          </Text>

          <Text className="text-center text-[13px] text-[#434655]">
            {listings.length === 0
              ? "There are no listings yet."
              : "Try changing your search or filters."}
          </Text>
        </View>
      ) : (
        <>
          {featured.length > 0 && (
            <>
              <SectionHeader title="Featured Verified" />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                  gap: 16,
                }}
              >
                {featured.map((item) => (
                  <VehicleCard
                    key={item.id}
                    item={item}
                    featured
                    onOpen={() => open(item.id)}
                    onSave={() => toggleSave(item)}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {feed.length > 0 && (
            <>
              <SectionHeader title="Latest Listings" />

              <View className="px-4 gap-3.5 mt-2">
                {feed.map((item) => (
                  <VehicleCard
                    key={item.id}
                    item={item}
                    onOpen={() => open(item.id)}
                    onSave={() => toggleSave(item)}
                  />
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}
