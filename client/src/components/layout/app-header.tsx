import { NotificationBell } from "@/components/layout/notification-bell";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
type IconName = keyof typeof Ionicons.glyphMap;

const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

const TONES = {
  success: { icon: "checkmark-circle", color: "#006242", text: "text-success" },
  warning: { icon: "alert-circle", color: "#92400e", text: "text-amber-900" },
  danger: { icon: "close-circle", color: "#ba1a1a", text: "text-danger" },
  neutral: { icon: "help-circle", color: "#434655", text: "text-muted" },
} as const;

export type StatusTone = keyof typeof TONES;

type BrandProps = {
  variant?: "brand";
  initials?: string;
  avatar?: ImageSourcePropType;
  hasUnread?: boolean;
  ledgerLive?: boolean;
  onPressNotifications?: () => void;
  onPressProfile?: () => void;
  onPressSettings?: () => void;
  onLogout?: () => void;
};

type DetailProps = {
  variant: "detail";
  title: string;
  statusLabel?: string;
  statusTone?: StatusTone;
  saved?: boolean;
  onBack?: () => void;
  onShare?: () => void;
  onSave?: () => void;
};

type SecureProps = {
  variant: "secure";
  label: string;
  onBack?: () => void;
  onPressShield?: () => void;
};

type AdminProps = {
  variant: "admin";
  title?: string;
  level?: string;
  node?: string;
  algo?: string;
  live?: boolean;
  onPressShield?: () => void;
};

export type AppHeaderProps =
  | BrandProps
  | DetailProps
  | SecureProps
  | AdminProps;

function MenuItem({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      className="h-11 flex-row items-center gap-3 rounded-xl px-3 active:bg-tint-100"
    >
      <Ionicons name={icon} size={18} color={danger ? "#ba1a1a" : "#434655"} />
      <Text
        className={`font-sans-semibold text-sm ${
          danger ? "text-danger" : "text-ink"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Shell({
  children,
  tall = false,
  dark = false,
}: {
  children: ReactNode;
  tall?: boolean;
  dark?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={
        dark
          ? "border-b border-white/10 bg-ink"
          : "border-b border-tint-200 bg-white/95 shadow-sm"
      }
      style={{ paddingTop: insets.top }}
    >
      <View className={`flex-row items-center px-4 ${tall ? "h-16" : "h-14"}`}>
        {children}
      </View>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  dark = false,
  color,
  borderClass,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  dark?: boolean;
  color?: string;
  borderClass?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      className={`h-10 w-10 items-center justify-center rounded-xl border ${
        borderClass ??
        (dark ? "border-white/15 bg-white/5" : "border-tint-200 bg-white")
      }`}
    >
      <Ionicons
        name={icon}
        size={20}
        color={color ?? (dark ? "#ffffff" : "#0b1c30")}
      />
    </Pressable>
  );
}

function BrandHeader({
  initials = "?",
  avatar,
  hasUnread = false,
  ledgerLive = false,
  onPressNotifications,
  onPressProfile,
  onPressSettings,
  onLogout,
}: BrandProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const run = (fn?: () => void) => {
    setOpen(false);
    fn?.();
  };

  const router = useRouter();

  return (
    <Shell tall>
      <View className="flex-1 flex-row items-center gap-2.5">
        <View className="h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-tint-50">
          <Ionicons name="shield-checkmark-outline" size={22} color="#2563eb" />
        </View>
        <View>
          <View className="flex-row items-center gap-1.5">
            <Text className="font-sans-bold text-lg leading-5 tracking-[-0.45px] text-ink">
              VeriDrive
            </Text>
            <View className="h-1.5 w-1.5 rounded-full bg-primary" />
          </View>
          <Text className="font-sans-semibold text-[11px] leading-[14px] text-muted">
            Trust Network
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-1">
        {ledgerLive && (
          <View className="mr-1 flex-row items-center gap-1.5 rounded-full border border-success/20 bg-success-soft/40 px-2.5 py-1">
            <View className="h-1.5 w-1.5 rounded-full bg-success-bar" />
            <Text className="font-sans-bold text-[11px] text-success-on">
              Ledger Live
            </Text>
          </View>
        )}

        <NotificationBell />

        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open profile menu"
          accessibilityState={{ expanded: open }}
          className="h-10 w-10 items-center justify-center"
        >
          {avatar ? (
            <Image source={avatar} className="h-9 w-9 rounded-full" />
          ) : (
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
              <Text className="font-sans-bold text-xs text-white">
                {initials}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable className="flex-1" onPress={() => setOpen(false)}>
          <View
            className="absolute right-4 w-52 rounded-2xl border border-tint-200 bg-white p-1.5 shadow-lg"
            style={{ top: insets.top + 60, elevation: 8 }}
          >
            <MenuItem
              icon="person-outline"
              label="Profile"
              onPress={() => run(onPressProfile)}
            />
            <MenuItem
              icon="settings-outline"
              label="Settings"
              onPress={() => run(() => router.push("/settings" as any))}
            />
            <View className="mx-2 my-1 h-px bg-tint-200" />
            <MenuItem
              icon="log-out-outline"
              label="Log out"
              danger
              onPress={() => run(onLogout)}
            />
          </View>
        </Pressable>
      </Modal>
    </Shell>
  );
}

function DetailHeader({
  title,
  statusLabel,
  statusTone = "neutral",
  saved = false,
  onBack,
  onShare,
  onSave,
}: DetailProps) {
  const tone = TONES[statusTone];
  return (
    <Shell>
      <View className="w-24 items-start">
        <IconButton icon="arrow-back" label="Back" onPress={onBack} />
      </View>

      <View className="flex-1 items-center">
        <Text
          numberOfLines={1}
          className="font-sans-bold text-[15px] leading-5 text-ink"
        >
          {title}
        </Text>
        {statusLabel ? (
          <View className="flex-row items-center gap-1">
            <Ionicons name={tone.icon} size={11} color={tone.color} />
            <Text
              className={`font-sans-semibold text-[11px] leading-[14px] ${tone.text}`}
            >
              {statusLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="w-24 flex-row items-center justify-end">
        <Pressable
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel="Share"
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="share-outline" size={20} color="#434655" />
        </Pressable>
        <Pressable
          onPress={onSave}
          accessibilityRole="button"
          accessibilityLabel={saved ? "Remove bookmark" : "Bookmark"}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={20}
            color={saved ? "#2563eb" : "#434655"}
          />
        </Pressable>
      </View>
    </Shell>
  );
}

function SecureHeader({ label, onBack, onPressShield }: SecureProps) {
  return (
    <Shell dark>
      <View className="w-12 items-start">
        <IconButton icon="arrow-back" label="Back" onPress={onBack} dark />
      </View>

      <View className="flex-1 items-center">
        <View className="flex-row items-center gap-1.5 rounded-full border border-success-soft/25 bg-white/5 px-3 py-1.5">
          <Ionicons name="lock-closed-outline" size={12} color="#6ffbbe" />
          <Text
            numberOfLines={1}
            className="font-sans-bold text-[10px] tracking-[0.8px] text-success-soft"
          >
            {label}
          </Text>
        </View>
      </View>

      <View className="w-12 items-end">
        <IconButton
          icon="shield-checkmark-outline"
          label="Security details"
          onPress={onPressShield}
          dark
          color="#6ffbbe"
          borderClass="border-success-soft/30 bg-white/5"
        />
      </View>
    </Shell>
  );
}

function AdminHeader({
  title = "Admin Investigation",
  level,
  node,
  algo,
  live = false,
  onPressShield,
}: AdminProps) {
  const meta = [node ? `NODE: ${node}` : null, algo]
    .filter(Boolean)
    .join(" • ");

  return (
    <Shell>
      <Pressable
        onPress={onPressShield}
        accessibilityRole="button"
        accessibilityLabel="Admin shield"
        className="mr-2.5 h-10 w-10 items-center justify-center rounded-xl border border-danger/20 bg-danger-soft"
      >
        <Ionicons name="shield-outline" size={20} color="#ba1a1a" />
      </Pressable>

      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text
            numberOfLines={1}
            className="font-sans-bold text-[15px] leading-5 text-ink"
          >
            {title}
          </Text>
          {level ? (
            <View className="rounded border border-danger/30 bg-danger-soft px-1.5 py-px">
              <Text className="font-sans-bold text-[10px] text-danger">
                {level}
              </Text>
            </View>
          ) : null}
        </View>
        {meta ? (
          <Text
            numberOfLines={1}
            className="text-[10px] leading-[13px] text-muted"
            style={{ fontFamily: MONO }}
          >
            {meta}
          </Text>
        ) : null}
      </View>

      {live && (
        <View className="flex-row items-center gap-1.5 rounded-full bg-tint-100 px-2.5 py-1">
          <View className="h-1.5 w-1.5 rounded-full bg-success-bar" />
          <Text className="font-sans-bold text-[10px] tracking-[0.6px] text-success-on">
            MOD LIVE
          </Text>
        </View>
      )}
    </Shell>
  );
}

export function AppHeader(props: AppHeaderProps) {
  if (props.variant === "detail") return <DetailHeader {...props} />;
  if (props.variant === "secure") return <SecureHeader {...props} />;
  if (props.variant === "admin") return <AdminHeader {...props} />;
  return <BrandHeader {...props} />;
}
