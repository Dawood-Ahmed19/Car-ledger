import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "../context/auth";
import { RealtimeProvider } from "../context/realtime";
import "../global.css";

SplashScreen.preventAutoHideAsync();

const MIN_LOADER_MS = 900;

function RootNavigator() {
  const { status } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [minTimePassed, setMinTimePassed] = useState(false);
  const inAuth = segments[0] === "login" || segments[0] === "signup";

  useEffect(() => {
    SplashScreen.hideAsync();
    const t = setTimeout(() => setMinTimePassed(true), MIN_LOADER_MS);
    return () => clearTimeout(t);
  }, []);

  const target =
    status === "signedOut" && !inAuth
      ? "/login"
      : status === "signedIn" && inAuth
        ? "/"
        : null;

  useEffect(() => {
    if (minTimePassed && target) router.replace(target);
  }, [minTimePassed, target, router]);

  if (status === "loading" || !minTimePassed) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-white">
      <Stack screenOptions={{ headerShown: false }} />
      {target ? (
        <View style={StyleSheet.absoluteFill}>
          <LoadingScreen />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <RootNavigator />
      </RealtimeProvider>
    </AuthProvider>
  );
}
