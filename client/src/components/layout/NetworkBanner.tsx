import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Mode = "hidden" | "offline" | "back";

// Distance below the status bar. Raise it if the pill covers your header.
const HEADER_OFFSET = 70;

export function NetworkBanner() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("hidden");
  const [label, setLabel] = useState<"offline" | "back">("offline"); // keeps the text steady while fading out
  const wasOffline = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((s) => {
      // "unknown" (null) counts as online, so the badge never flashes at startup
      const offline =
        s.isConnected === false || s.isInternetReachable === false;

      if (offline) {
        if (timer.current) clearTimeout(timer.current);
        wasOffline.current = true;
        setLabel("offline");
        setMode("offline");
      } else if (wasOffline.current) {
        if (timer.current) clearTimeout(timer.current);
        wasOffline.current = false;
        setLabel("back");
        setMode("back");
        timer.current = setTimeout(() => setMode("hidden"), 2500);
      }
      // extra "online" events after reconnecting are ignored, so the timer keeps running
    });
    return () => {
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: mode === "hidden" ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [mode, anim]);

  const offline = label === "offline";

  return (
    <Animated.View
      pointerEvents="none" // never blocks taps underneath
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        top: insets.top + HEADER_OFFSET,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 999,
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-12, 0],
            }),
          },
        ],
      }}
    >
      <View
        className={`flex-row items-center gap-2 rounded-full px-4 py-2 shadow-md ${
          offline ? "bg-red-600" : "bg-green-600"
        }`}
        style={{ elevation: 6 }}
      >
        <Ionicons
          name={offline ? "cloud-offline-outline" : "checkmark-circle-outline"}
          size={16}
          color="#fff"
        />
        <Text className="text-[13px] font-semibold text-white">
          {offline ? "No internet connection" : "Back online"}
        </Text>
      </View>
    </Animated.View>
  );
}
