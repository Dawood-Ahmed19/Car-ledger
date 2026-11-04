import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Text, View } from "react-native";

export function LoadingScreen({ message }: { message?: string }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <View
      className="flex-1 items-center justify-center bg-white px-8"
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      <Animated.View
        style={{ transform: [{ scale }] }}
        className="h-24 w-24 items-center justify-center rounded-3xl border border-primary/20 bg-tint-50"
      >
        <Ionicons name="shield-checkmark-outline" size={48} color="#2563eb" />
      </Animated.View>

      <View className="mt-6 flex-row items-center gap-2">
        <Text className="font-sans-bold text-3xl tracking-[-0.45px] text-ink">
          VeriDrive
        </Text>
        <View className="h-2 w-2 rounded-full bg-primary" />
      </View>
      <Text className="mt-1 font-sans-semibold text-sm text-muted">
        Trust Network
      </Text>

      <View className="mt-10 items-center gap-3">
        <ActivityIndicator color="#2563eb" />
        {message ? <Text className="text-xs text-muted">{message}</Text> : null}
      </View>
    </View>
  );
}
