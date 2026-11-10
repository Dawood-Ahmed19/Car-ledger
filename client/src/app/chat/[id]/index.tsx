import { ScamBanner } from "@/components/chat/scam-banner";
import { AppHeader } from "@/components/layout/app-header";
import {
  EvidenceChip,
  formatPrice,
  type ListingSummary,
} from "@/components/messages/conversation-card";
import { setActiveConversation, useRealtime } from "@/context/realtime";
import { api, assetUrl } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Msg = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  scamRisk?: "low" | "high";
  scamWarning?: string;
};

type Meta = {
  id: string;
  listing: ListingSummary;
  otherUser: { id: string; name: string };
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [meta, setMeta] = useState<Meta | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Msg>>(null);
  const { subscribe } = useRealtime();

  useEffect(() => {
    return subscribe(
      "message:warning",
      (w: {
        conversationId: string;
        messageId: string;
        risk: "low" | "high";
        warning: string;
      }) => {
        if (w.conversationId !== id) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === w.messageId
              ? { ...m, scamRisk: w.risk, scamWarning: w.warning }
              : m,
          ),
        );
      },
    );
  }, [id, subscribe]);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/messages" as any);

  const load = useCallback(async () => {
    try {
      const res = await api<{ conversation: Meta; messages: Msg[] }>(
        `/api/conversations/${id}/messages`,
      );
      setMeta(res.conversation);
      setMessages(res.messages);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Could not load this chat.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    setActiveConversation(String(id));

    // new message pushed from the server over the socket
    const offNew = subscribe(
      "message:new",
      ({
        conversationId,
        message,
      }: {
        conversationId: string;
        message: Msg;
      }) => {
        if (conversationId !== id) return;
        setMessages((m) =>
          m.some((x) => x.id === message.id) ? m : [...m, message],
        );
        // you're looking at it, so mark it read right away
        if (!message.mine) {
          api(`/api/conversations/${id}/read`, { method: "POST" }).catch(
            () => {},
          );
        }
      },
    );
    // after a dropped connection, re-sync anything we missed
    const offConnect = subscribe("connect", load);

    return () => {
      offNew();
      offConnect();
      setActiveConversation(null);
    };
  }, [id, load, subscribe]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      const msg = await api<Msg>(`/api/conversations/${id}/messages`, {
        method: "POST",
        body: { body },
      });
      setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
    } catch {
      setText(body); // give the text back so nothing is lost
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <AppHeader variant="detail" title="Chat" onBack={goBack} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    );
  }

  if (!meta) {
    return (
      <View className="flex-1 bg-white">
        <AppHeader variant="detail" title="Chat" onBack={goBack} />
        <View className="flex-1 items-center justify-center gap-2 p-8">
          <Ionicons name="chatbubble-outline" size={40} color="#94a3b8" />
          <Text className="font-sans-bold text-lg text-ink">
            Could not open this chat
          </Text>
          <Text className="text-center text-sm text-muted">{error}</Text>
        </View>
      </View>
    );
  }

  const { listing } = meta;
  const sub = [formatPrice(listing.price), listing.city]
    .filter(Boolean)
    .join(" • ");
  const canSend = !!text.trim() && !sending;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <AppHeader variant="detail" title={meta.otherUser.name} onBack={goBack} />

      {/* Listing this chat is about */}
      <Pressable
        onPress={() => router.push(`/listing/${listing.id}` as any)}
        className="mx-4 mt-3 flex-row items-center gap-3 rounded-2xl border border-tint-200 bg-tint-50 p-2.5 active:opacity-80"
      >
        {listing.photoUrl ? (
          <Image
            source={{ uri: assetUrl(listing.photoUrl) }}
            className="h-9 w-12 rounded-md bg-tint-100"
          />
        ) : (
          <View className="h-9 w-12 items-center justify-center rounded-md bg-tint-100">
            <Ionicons name="car-sport-outline" size={18} color="#94a3b8" />
          </View>
        )}
        <View className="flex-1">
          <Text
            className="font-sans-semibold text-[13px] text-ink"
            numberOfLines={1}
          >
            {listing.title}
          </Text>
          {!!sub && (
            <Text className="text-[11px] text-muted" numberOfLines={1}>
              {sub}
            </Text>
          )}
        </View>
        <EvidenceChip status={listing.evidenceStatus} />
        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
      </Pressable>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerClassName="gap-2 p-4 grow"
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: false })
        }
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-sm text-muted">
              Send the first message to start the conversation.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            className={`max-w-[82%] rounded-2xl px-3 py-2 ${
              item.mine
                ? "self-end rounded-br-sm bg-primary"
                : "self-start rounded-bl-sm border border-tint-200 bg-tint-50"
            }`}
          >
            <Text
              className={`text-[15px] leading-[21px] ${
                item.mine ? "text-white" : "text-ink"
              }`}
            >
              {item.body}
            </Text>
            <Text
              className={`mt-0.5 self-end text-[10px] ${
                item.mine ? "text-white/70" : "text-muted"
              }`}
            >
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
            {!item.mine && item.scamRisk && item.scamWarning && (
              <ScamBanner risk={item.scamRisk} warning={item.scamWarning} />
            )}
          </View>
        )}
      />

      {/* Input bar */}
      <View
        className="flex-row items-end gap-2 border-t border-tint-200 bg-white px-3 pt-2.5"
        style={{
          paddingBottom:
            Platform.OS === "android" ? 12 : Math.max(insets.bottom, 12),
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message"
          placeholderTextColor="#94a3b8"
          multiline
          maxLength={2000}
          className="max-h-28 flex-1 rounded-2xl bg-tint-50 px-4 py-2.5 text-[15px] text-ink"
        />
        <Pressable
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          className={`h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80 ${
            canSend ? "" : "opacity-40"
          }`}
        >
          {sending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Ionicons name="send" size={18} color="#ffffff" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
