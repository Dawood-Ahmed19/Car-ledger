import { Image, Pressable, Text, View } from "react-native";
import { Badge } from "../ui/Badge";
import { STATUS_BADGE, TIER_BADGE } from "../../constants/listing";
import type { Listing } from "../../types";

interface Props {
  listing: Listing;
  onPress: (id: string) => void;
}

export function ListingCard({ listing: l, onPress }: Props) {
  const status = STATUS_BADGE[l.status];
  const tier = l.sellerTier ? TIER_BADGE[l.sellerTier] : null;

  return (
    <Pressable
      onPress={() => onPress(l.id)}
      accessibilityRole="button"
      accessibilityLabel={`${l.title}, ${l.priceLabel}, ${status.label}`}
      className="overflow-hidden rounded-2xl border border-tint-300 bg-white active:opacity-80"
    >
      <View className="h-40 bg-tint-300">
        {l.imageUrl ? (
          <Image
            source={{ uri: l.imageUrl }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : null}
        <View className="absolute left-3 top-3">
          <Badge label={status.label} tone={status.tone} />
        </View>
      </View>

      <View className="gap-1 p-4">
        <Text className="font-sans-bold text-base text-ink">{l.title}</Text>
        <Text className="font-sans-bold text-lg text-ink">{l.priceLabel}</Text>
        <Text className="text-sm text-ink/70">
          {l.mileageLabel} · {l.city}
        </Text>
        {tier ? (
          <View className="pt-2">
            <Badge
              label={tier.label}
              tone={tier.tone}
              icon={<View className={`h-2 w-2 rounded-full ${tier.dot}`} />}
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
