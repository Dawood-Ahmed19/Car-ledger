// src/app/profile.tsx
import { AppHeader } from "@/components/layout/app-header";
import { useAuth } from "@/context/auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

const ROLE_LABEL = {
  buyer: "Buyer",
  seller: "Seller",
  admin: "Admin",
} as const;

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  danger = false,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={label}
      className="min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-tint-100"
    >
      <Ionicons name={icon} size={20} color={danger ? "#ba1a1a" : "#434655"} />
      <View className="flex-1">
        <Text
          className={`font-sans-semibold text-[15px] ${danger ? "text-danger" : "text-ink"}`}
        >
          {label}
        </Text>
        {value ? (
          <Text className="mt-0.5 text-[13px] text-muted">{value}</Text>
        ) : null}
      </View>
      {onPress && !danger ? (
        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
      ) : null}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Text className="mb-2 px-1 font-sans-bold text-[11px] uppercase tracking-[0.8px] text-muted">
        {title}
      </Text>
      <View className="overflow-hidden rounded-2xl border border-tint-200 bg-white">
        {children}
      </View>
    </View>
  );
}

const Divider = () => <View className="ml-12 h-px bg-tint-200" />;

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  if (!user) return null;

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  const confirmSignOut = () =>
    Alert.alert("Log out", "You will need to log in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => signOut() },
    ]);

  return (
    <View className="flex-1 bg-white">
      <AppHeader variant="detail" title="Profile" onBack={goBack} />

      <ScrollView
        contentContainerClassName="gap-6 p-4 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Identity card */}
        <View className="items-center rounded-2xl border border-tint-200 bg-tint-50 p-6">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-primary">
            <Text className="font-sans-bold text-3xl text-white">
              {initials(user.fullName)}
            </Text>
          </View>
          <Text className="mt-4 font-sans-bold text-2xl tracking-[-0.45px] text-ink">
            {user.fullName}
          </Text>
          <Text className="mt-0.5 text-sm text-muted">@{user.username}</Text>

          <View className="mt-3 flex-row items-center gap-1.5 rounded-full border border-primary/20 bg-white px-3 py-1.5">
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color="#2563eb"
            />
            <Text className="font-sans-bold text-xs text-primary">
              {ROLE_LABEL[user.role]} account
            </Text>
          </View>
        </View>

        <Section title="Account">
          <Row icon="person-outline" label="Full name" value={user.fullName} />
          <Divider />
          <Row icon="at-outline" label="Username" value={`@${user.username}`} />
          <Divider />
          <Row
            icon="briefcase-outline"
            label="Account type"
            value={ROLE_LABEL[user.role]}
          />
        </Section>

        <Section title="Activity">
          <Row
            icon="bookmark-outline"
            label="Saved listings"
            onPress={() => router.push("/saved")}
          />
          <Divider />
          <Row
            icon="document-text-outline"
            label="My evidence reports"
            onPress={() => router.push("/evidence")}
          />
          {user.role !== "buyer" && (
            <>
              <Divider />
              <Row
                icon="car-outline"
                label="My listings"
                onPress={() => router.push("/my-listings")}
              />
            </>
          )}
        </Section>

        <Section title="Settings">
          <Row
            icon="notifications-outline"
            label="Notifications"
            onPress={() => {}}
          />
          <Divider />
          <Row
            icon="lock-closed-outline"
            label="Privacy and security"
            onPress={() => {}}
          />
          <Divider />
          <Row
            icon="help-circle-outline"
            label="Help and support"
            onPress={() => {}}
          />
        </Section>

        <Section title="Session">
          <Row
            icon="log-out-outline"
            label="Log out"
            onPress={confirmSignOut}
            danger
          />
        </Section>
      </ScrollView>
    </View>
  );
}
