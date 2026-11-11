import { useAuth } from "@/context/auth";
import { unregisterPush } from "@/context/realtime";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = keyof typeof Ionicons.glyphMap;

type Prefs = {
  hideFullName: boolean;
  notifyMessages: boolean;
  notifyScam: boolean;
  notifyEvidence: boolean;
};

const DEFAULTS: Prefs = {
  hideFullName: false,
  notifyMessages: true,
  notifyScam: true,
  notifyEvidence: true,
};

const BLUE = "#2563eb";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View className="mt-5">
      <View className="mb-1.5 flex-row items-center justify-between px-1">
        <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {title}
        </Text>
        {hint ? (
          <Text className="text-[11px] font-bold text-blue-600">{hint}</Text>
        ) : null}
      </View>
      <View className="overflow-hidden rounded-xl bg-white">{children}</View>
    </View>
  );
}

function Row({
  icon,
  title,
  subtitle,
  right,
  onPress,
  danger,
  last,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center gap-3 px-3 py-3 active:bg-blue-50 ${last ? "" : "border-b border-slate-100"}`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
        <Ionicons name={icon} size={20} color={danger ? "#ba1a1a" : BLUE} />
      </View>
      <View className="flex-1">
        <Text
          className={`text-[15px] font-semibold ${danger ? "text-red-700" : "text-slate-900"}`}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[13px] text-slate-500">{subtitle}</Text>
        ) : null}
      </View>
      {right ??
        (onPress ? (
          <Ionicons name="chevron-forward" size={18} color="#737686" />
        ) : null)}
    </Pressable>
  );
}

function ToggleRow(props: {
  icon: IconName;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <Row
      icon={props.icon}
      title={props.title}
      subtitle={props.subtitle}
      last={props.last}
      right={
        <Switch
          value={props.value}
          onValueChange={props.onChange}
          trackColor={{ true: BLUE, false: "#d3e4fe" }}
          thumbColor="#fff"
          accessibilityLabel={props.title}
        />
      }
    />
  );
}

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  // load the saved preferences
  useEffect(() => {
    api<Prefs>("/api/me/settings")
      .then(setPrefs)
      .catch(() => {});
  }, []);

  // flip instantly, save in the background, undo if saving fails
  const update = async (key: keyof Prefs, value: boolean) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    try {
      await api("/api/me/settings", {
        method: "POST",
        body: { [key]: value },
      });
    } catch {
      setPrefs((p) => ({ ...p, [key]: !value }));
      Alert.alert("Couldn't save", "Check your connection and try again.");
    }
  };

  const confirmLogout = () =>
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await unregisterPush(); // stop pushes for this account on this phone
          await signOut();
        },
      },
    ]);

  const initials = (user?.fullName ?? "?")
    .split(" ")
    .filter(Boolean)
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View
        className="flex-row items-center gap-2 border-b border-slate-100 bg-white px-3 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          className="h-11 w-11 items-center justify-center rounded-lg active:bg-blue-50"
        >
          <Ionicons name="arrow-back" size={24} color="#0b1c30" />
        </Pressable>
        <Text className="text-lg font-semibold text-slate-900">Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View className="rounded-xl bg-white p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-blue-600">
              <Text className="text-xl font-bold text-white">{initials}</Text>
            </View>
            <View className="flex-1">
              <Text
                className="text-lg font-semibold text-slate-900"
                numberOfLines={1}
              >
                {user?.fullName}
              </Text>
              <Text className="text-[13px] text-slate-500" numberOfLines={1}>
                {user?.username}
              </Text>
              <View className="mt-1.5 self-start rounded-full bg-blue-50 px-2 py-0.5">
                <Text className="text-[11px] font-bold capitalize text-blue-600">
                  {user?.role}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Section title="Account">
          <Row
            icon="person-outline"
            title="Full name"
            subtitle={user?.fullName}
          />
          <Row
            icon="at-outline"
            title="Username"
            subtitle={user?.username}
            last
          />
        </Section>

        <Section title="Notifications">
          <ToggleRow
            icon="chatbubble-ellipses-outline"
            title="New messages"
            subtitle="Push alerts when the app is closed"
            value={prefs.notifyMessages}
            onChange={(v) => update("notifyMessages", v)}
          />
          <ToggleRow
            icon="warning-outline"
            title="Scam warnings"
            subtitle="Pop-up and bell alerts about suspicious messages"
            value={prefs.notifyScam}
            onChange={(v) => update("notifyScam", v)}
          />
          <ToggleRow
            icon="shield-checkmark-outline"
            title="Evidence updates"
            subtitle="When a document or listing is reviewed"
            value={prefs.notifyEvidence}
            onChange={(v) => update("notifyEvidence", v)}
            last
          />
        </Section>

        <Section title="Privacy">
          <ToggleRow
            icon="eye-off-outline"
            title="Hide my full name"
            subtitle="Others see your first name and last initial"
            value={prefs.hideFullName}
            onChange={(v) => update("hideFullName", v)}
            last
          />
        </Section>

        <Section title="Security">
          <Row
            icon="lock-closed-outline"
            title="Change password"
            onPress={() => router.push("/settings/password")}
          />
          <Row
            icon="phone-portrait-outline"
            title="Log out of this device"
            onPress={confirmLogout}
            last
          />
        </Section>

        <Section title="Safety tips">
          <Row
            icon="information-circle-outline"
            title="Avoid scams"
            subtitle="Never pay in advance. Meet, inspect and verify papers first."
            last
          />
        </Section>

        <Pressable
          onPress={() =>
            Alert.alert("Delete account", "This will be added in a later step.")
          }
          className="mt-6 items-center rounded-lg py-3 active:bg-red-50"
        >
          <Text className="text-[15px] font-semibold text-red-700">
            Delete account
          </Text>
        </Pressable>

        <Text className="mt-4 text-center text-[11px] text-slate-400">
          CarLedger
        </Text>
      </ScrollView>
    </View>
  );
}
