import { memo } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { assetUrl } from "@/lib/api";

export type EvidenceStatus =
  | "verified"
  | "under_review"
  | "not_checked"
  | "recalled"
  | "removed";

export type ListingSummary = {
  id: string;
  title: string;
  price: number | null;
  city: string | null;
  photoUrl: string | null;
  evidenceStatus: EvidenceStatus;
};

export type ConversationItem = {
  id: string;
  role: "buying" | "selling";
  archived: boolean;
  otherUser: { id: string; name: string };
  listing: ListingSummary;
  lastMessage: { body: string; createdAt: string; mine: boolean } | null;
  unreadCount: number;
  lastMessageAt: string;
};

// box/text = Tailwind classes, color = same color for the icon (icons need a hex value)
export const EVIDENCE = {
  verified: {
    label: "Verified",
    icon: "verified-user",
    box: "bg-emerald-700",
    text: "text-white",
    color: "#ffffff",
  },
  under_review: {
    label: "Under review",
    icon: "hourglass-empty",
    box: "bg-slate-200",
    text: "text-slate-600",
    color: "#475569",
  },
  not_checked: {
    label: "Not yet checked",
    icon: "help-outline",
    box: "bg-blue-100",
    text: "text-slate-600",
    color: "#475569",
  },
  recalled: {
    label: "Recalled",
    icon: "report-problem",
    box: "bg-red-100",
    text: "text-red-700",
    color: "#b91c1c",
  },
  removed: {
    label: "Removed",
    icon: "block",
    box: "bg-red-100",
    text: "text-red-700",
    color: "#b91c1c",
  },
} as const;

export const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

export function formatPrice(n: number | null) {
  if (n == null) return "";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `PKR ${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  return `PKR ${n.toLocaleString()}`;
}

export function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export function EvidenceChip({ status }: { status: EvidenceStatus }) {
  const ev = EVIDENCE[status] ?? EVIDENCE.not_checked;
  return (
    <View
      className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${ev.box}`}
    >
      <MaterialIcons name={ev.icon as any} size={12} color={ev.color} />
      <Text className={`text-[11px] font-bold ${ev.text}`}>{ev.label}</Text>
    </View>
  );
}

function ConversationCardBase({
  item,
  onPress,
}: {
  item: ConversationItem;
  onPress: () => void;
}) {
  const unread = item.unreadCount > 0;
  const { listing } = item;
  const sub = [formatPrice(listing.price), listing.city]
    .filter(Boolean)
    .join(" • ");
  const preview = item.lastMessage
    ? item.lastMessage.mine
      ? `You: ${item.lastMessage.body}`
      : item.lastMessage.body
    : "No messages yet. Say hello!";

  return (
    <Pressable
      onPress={onPress}
      className="gap-3 rounded-xl bg-white p-4 shadow-sm active:opacity-90"
    >
      <View className="flex-row gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-600">
          <Text className="text-base font-bold text-white">
            {initials(item.otherUser.name)}
          </Text>
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text
              className="flex-1 text-lg font-semibold text-slate-900"
              numberOfLines={1}
            >
              {item.otherUser.name}
            </Text>
            <Text
              className={`text-[11px] ${unread ? "font-semibold text-blue-700" : "text-slate-500"}`}
            >
              {timeLabel(item.lastMessageAt)}
            </Text>
          </View>

          {/* vehicle pill */}
          <View className="mt-2 flex-row items-center gap-2 rounded-lg bg-blue-50 p-2">
            {listing.photoUrl ? (
              <Image
                source={{ uri: assetUrl(listing.photoUrl) }}
                className="h-8 w-10 rounded bg-slate-100"
              />
            ) : (
              <View className="h-8 w-10 items-center justify-center rounded bg-slate-100">
                <MaterialIcons
                  name="directions-car"
                  size={18}
                  color="#64748b"
                />
              </View>
            )}
            <View className="flex-1">
              <Text
                className="text-xs font-semibold text-slate-900"
                numberOfLines={1}
              >
                {listing.title}
              </Text>
              {!!sub && (
                <Text className="text-[11px] text-slate-500" numberOfLines={1}>
                  {sub}
                </Text>
              )}
            </View>
            <EvidenceChip status={listing.evidenceStatus} />
          </View>
        </View>
      </View>

      {/* message preview + unread badge */}
      <View className="flex-row items-center justify-between gap-2">
        <Text
          className={`flex-1 text-sm ${unread ? "font-medium text-slate-900" : "text-slate-600"}`}
          numberOfLines={2}
        >
          {preview}
        </Text>
        {unread && (
          <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-700 px-1.5">
            <Text className="text-[11px] font-bold text-white">
              {item.unreadCount > 99 ? "99+" : item.unreadCount}
            </Text>
          </View>
        )}
      </View>

      {/* footer */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
          <MaterialIcons
            name={item.role === "buying" ? "shopping-bag" : "sell"}
            size={14}
            color="#475569"
          />
          <Text className="text-[11px] font-semibold text-slate-600">
            {item.role === "buying" ? "You're buying" : "You're selling"}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-xs font-semibold text-blue-700">Reply</Text>
          <MaterialIcons name="chevron-right" size={18} color="#1d4ed8" />
        </View>
      </View>
    </Pressable>
  );
}

export const ConversationCard = memo(ConversationCardBase);
