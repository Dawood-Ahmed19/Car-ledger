import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { fetchUpdateCount } from "@/lib/saved";

export function EvidenceUpdateBanner() {
  const router = useRouter();
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchUpdateCount()
        .then((n) => active && setCount(n))
        .catch(() => active && setCount(0));
      return () => {
        active = false;
      };
    }, []),
  );

  if (count === 0) return null;

  return (
    <View className="flex-row items-center justify-between gap-3 rounded-xl bg-[#fdefc3] px-4 py-3">
      <Text className="flex-1 text-[13px] text-[#7a3e00]">
        Evidence update. {count} saved{" "}
        {count === 1 ? "listing has" : "listings have"} changed since you last
        looked.
      </Text>
      <Pressable onPress={() => router.push("/saved" as any)} hitSlop={8}>
        <Text className="text-[14px] font-semibold text-[#7a3e00]">View</Text>
      </Pressable>
    </View>
  );
}
