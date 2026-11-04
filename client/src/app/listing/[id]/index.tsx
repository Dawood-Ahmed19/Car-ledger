import { AppHeader, type StatusTone } from "@/components/layout/app-header";
import { useAuth } from "@/context/auth";
import { toClientListing } from "@/hooks/use-listings";
import { api, ApiError } from "@/lib/api";
import { markSeen, saveListing, unsaveListing } from "@/lib/saved";
import type { Listing, ListingStatus, Tier } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = ComponentProps<typeof Ionicons>["name"];

const STATUS: Record<
  ListingStatus,
  { label: string; tone: StatusTone; title: string; body: string }
> = {
  verified: {
    label: "Verified",
    tone: "success",
    title: "Evidence checked",
    body: "The report and photos for this car have been checked.",
  },
  under_review: {
    label: "Under review",
    tone: "warning",
    title: "Check in progress",
    body: "The evidence for this car is being reviewed. Details may change.",
  },
  not_checked: {
    label: "Not yet checked",
    tone: "neutral",
    title: "Not checked yet",
    body: "No one has checked the report or photos for this car yet. Ask the seller for proof before you pay.",
  },
  recalled: {
    label: "Recalled",
    tone: "danger",
    title: "Listing recalled",
    body: "This listing was recalled after a problem with its evidence. Do not pay until it is resolved.",
  },
  removed: {
    label: "Removed",
    tone: "danger",
    title: "Listing removed",
    body: "This listing has been taken down.",
  },
};

const TIER_LABEL: Record<Tier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

const EVIDENCE_LABEL: Record<string, { label: string; icon: IconName }> = {
  registration: { label: "Registration book", icon: "document-text-outline" },
  inspection: { label: "Inspection report", icon: "clipboard-outline" },
  service: { label: "Service history", icon: "construct-outline" },
  owner_cnic: { label: "Owner ID match", icon: "id-card-outline" },
};

const BANNER: Record<
  StatusTone,
  { box: string; icon: IconName; color: string; text: string }
> = {
  success: {
    box: "border-success/20 bg-success-soft/40",
    icon: "checkmark-circle",
    color: "#006242",
    text: "text-success-on",
  },
  warning: {
    box: "border-amber-200 bg-amber-100",
    icon: "alert-circle",
    color: "#92400e",
    text: "text-amber-900",
  },
  danger: {
    box: "border-danger/20 bg-danger-soft",
    icon: "close-circle",
    color: "#ba1a1a",
    text: "text-danger",
  },
  neutral: {
    box: "border-tint-200 bg-tint-50",
    icon: "help-circle",
    color: "#434655",
    text: "text-ink",
  },
};

function Spec({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 gap-1 rounded-2xl border border-tint-200 bg-white p-3">
      <Ionicons name={icon} size={18} color="#434655" />
      <Text className="text-xs text-muted">{label}</Text>
      <Text className="font-sans-bold text-[15px] text-ink">{value}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-2 px-1 font-sans-bold text-[11px] uppercase tracking-[0.8px] text-muted">
      {children}
    </Text>
  );
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    markSeen(id).catch(() => {});
  }, [id]);

  useEffect(() => {
    let off = false;
    setLoading(true);
    setError(null);

    api<{ listing: Listing }>(`/api/listings/${id}`)
      .then((r) => {
        if (off) return;
        setListing(toClientListing(r.listing));
        setSaved(!!r.listing.isSaved);
      })
      .catch((e) => {
        if (off) return;
        setListing(null);
        setError(e instanceof ApiError && e.status !== 404 ? e.message : null);
      })
      .finally(() => {
        if (!off) setLoading(false);
      });

    return () => {
      off = true;
    };
  }, [id]);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  const toggleSaved = async () => {
    const next = !saved;
    setSaved(next); // update the UI immediately
    try {
      await (next ? saveListing(id) : unsaveListing(id));
    } catch (e) {
      setSaved(!next); // roll back if the server refused
      Alert.alert(
        "Couldn't update saved listings",
        e instanceof ApiError ? e.message : "Try again.",
      );
    }
  };

  const messageSeller = async () => {
    if (starting) return;
    setStarting(true);

    try {
      const { id: conversationId } = await api<{ id: string }>(
        "/api/conversations",
        {
          method: "POST",
          body: { listingId: id },
        },
      );

      router.push(`/chat/${conversationId}` as any);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push("/login" as any);
      } else {
        Alert.alert(
          "Couldn't start chat",
          e instanceof ApiError ? e.message : "Try again.",
        );
      }
    } finally {
      setStarting(false);
    }
  };

  const deleteListing = () => {
    Alert.alert(
      "Delete listing?",
      "This action cannot be undone. Are you sure you want to delete this listing?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (deleting) return;

            setDeleting(true);

            try {
              await api(`/api/listings/${id}`, {
                method: "DELETE",
              });

              Alert.alert("Listing deleted", "Your listing has been deleted.", [
                {
                  text: "OK",
                  onPress: () => router.replace("/"),
                },
              ]);
            } catch (e) {
              Alert.alert(
                "Couldn't delete listing",
                e instanceof ApiError ? e.message : "Please try again.",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <AppHeader variant="detail" title="Listing" onBack={goBack} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    );
  }

  if (!listing) {
    return (
      <View className="flex-1 bg-white">
        <AppHeader variant="detail" title="Listing" onBack={goBack} />
        <View className="flex-1 items-center justify-center gap-2 p-8">
          <Ionicons name="car-outline" size={40} color="#94a3b8" />
          <Text className="font-sans-bold text-lg text-ink">
            {error ? "Could not load this listing" : "Listing not found"}
          </Text>
          <Text className="text-center text-sm text-muted">
            {error ?? "It may have been removed."}
          </Text>
        </View>
      </View>
    );
  }

  const status = STATUS[listing.status];
  const banner = BANNER[status.tone];
  const canContact = listing.status !== "removed";
  const isOwner = !!user && user.id === listing.sellerId;
  console.log("Ownership debug:", {
    loggedInUserId: user?.id,
    listingSellerId: listing.sellerId,
    isOwner,
  });

  const photos = listing.photos?.length
    ? listing.photos
    : listing.imageUrl
      ? [listing.imageUrl]
      : [];

  return (
    <View className="flex-1 bg-white">
      <AppHeader
        variant="detail"
        title={listing.title}
        statusLabel={status.label}
        statusTone={status.tone}
        saved={saved}
        onBack={goBack}
        onSave={toggleSaved}
        onShare={() =>
          Share.share({ message: `${listing.title} - ${listing.priceLabel}` })
        }
      />

      <ScrollView
        contentContainerClassName="gap-5 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Photos */}
        {photos.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))
              }
            >
              {photos.map((uri) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  style={{ width, height: 240 }}
                  className="bg-tint-100"
                  resizeMode="cover"
                />
              ))}
            </ScrollView>

            {photos.length > 1 && (
              <View className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-1">
                <Text className="font-sans-bold text-xs text-white">
                  {photoIndex + 1}/{photos.length}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View className="h-60 w-full items-center justify-center bg-tint-100">
            <Ionicons name="car-sport-outline" size={56} color="#94a3b8" />
            <Text className="mt-2 text-xs text-muted">No photos yet</Text>
          </View>
        )}

        <View className="gap-5 px-4">
          {/* Title and price */}
          <View>
            <Text className="font-sans-bold text-2xl tracking-[-0.45px] text-ink">
              {listing.title}
            </Text>
            <Text className="mt-1 font-sans-bold text-xl text-primary">
              {listing.priceLabel}
            </Text>
          </View>

          {/* Evidence status */}
          <View
            className={`flex-row gap-3 rounded-2xl border p-4 ${banner.box}`}
          >
            <Ionicons name={banner.icon} size={22} color={banner.color} />
            <View className="flex-1">
              <Text className={`font-sans-bold text-[15px] ${banner.text}`}>
                {status.title}
              </Text>
              <Text className={`mt-0.5 text-sm ${banner.text}`}>
                {status.body}
              </Text>
            </View>
          </View>

          {/* Specs */}
          <View className="flex-row flex-wrap gap-3">
            <Spec
              icon="speedometer-outline"
              label="Mileage"
              value={listing.mileageLabel}
            />
            <Spec icon="location-outline" label="City" value={listing.city} />
            <Spec
              icon="car-sport-outline"
              label="Body Type"
              value={listing.bodyType || "Not specified"}
            />
            <Spec
              icon="water-outline"
              label="Fuel Type"
              value={listing.fuelType || "Not specified"}
            />
          </View>

          {/* About */}
          {listing.about ? (
            <View>
              <SectionTitle>About this car</SectionTitle>
              <Text className="px-1 text-[15px] leading-6 text-ink">
                {listing.about}
              </Text>
            </View>
          ) : null}

          {/* Evidence the seller says they have */}
          {listing.evidence && listing.evidence.length > 0 ? (
            <View>
              <SectionTitle>Evidence from the seller</SectionTitle>
              <View className="overflow-hidden rounded-2xl border border-tint-200 bg-white">
                {listing.evidence.map((key, i) => {
                  const item = EVIDENCE_LABEL[key];
                  if (!item) return null;

                  return (
                    <View
                      key={key}
                      className={`flex-row items-center gap-3 px-4 py-3 ${
                        i > 0 ? "border-t border-tint-200" : ""
                      }`}
                    >
                      <Ionicons name={item.icon} size={20} color="#434655" />
                      <Text className="flex-1 font-sans-semibold text-[15px] text-ink">
                        {item.label}
                      </Text>
                      <Text className="text-xs text-muted">
                        {listing.status === "verified"
                          ? "Checked"
                          : "Not checked"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Seller */}
          <View>
            <SectionTitle>Seller</SectionTitle>
            <View className="flex-row items-center gap-3 rounded-2xl border border-tint-200 bg-white p-4">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-tint-100">
                <Ionicons name="person-outline" size={22} color="#434655" />
              </View>
              <View className="flex-1">
                <Text className="font-sans-semibold text-[15px] text-ink">
                  Seller in {listing.city}
                </Text>
                <Text className="mt-0.5 text-sm text-muted">
                  {listing.sellerTier
                    ? `${TIER_LABEL[listing.sellerTier]} seller`
                    : "No seller tier yet"}
                </Text>
              </View>
              {listing.sellerTier && (
                <Ionicons name="ribbon-outline" size={22} color="#2563eb" />
              )}
            </View>
          </View>

          {/* Delete listing — owner only */}
          {isOwner && (
            <View className="mt-2">
              <Pressable
                onPress={deleteListing}
                disabled={deleting}
                accessibilityRole="button"
                accessibilityLabel="Delete listing"
                className="h-12 flex-row items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger-soft active:opacity-70"
              >
                {deleting ? (
                  <ActivityIndicator color="#ba1a1a" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color="#ba1a1a" />
                    <Text className="font-sans-bold text-base text-danger">
                      Delete listing
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action bar */}
      <View
        className="flex-row gap-3 border-t border-tint-200 bg-white px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Pressable
          onPress={toggleSaved}
          accessibilityRole="button"
          accessibilityLabel={saved ? "Remove from saved" : "Save listing"}
          className="h-12 w-12 items-center justify-center rounded-xl border border-tint-200 active:opacity-70"
        >
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={22}
            color={saved ? "#2563eb" : "#434655"}
          />
        </Pressable>

        <Pressable
          disabled={!canContact || starting}
          onPress={messageSeller}
          accessibilityRole="button"
          accessibilityLabel="Message seller"
          className={`h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-80 ${
            canContact ? "" : "opacity-50"
          }`}
        >
          {starting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={20}
                color="#ffffff"
              />
              <Text className="font-sans-bold text-base text-white">
                Message seller
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
