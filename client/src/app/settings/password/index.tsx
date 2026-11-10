import { api, ApiError } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MIN_LENGTH = 8; // keep the same as the server

function Field({
  label,
  value,
  onChangeText,
  show,
  onToggle,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  show: boolean;
  onToggle: () => void;
  autoFocus?: boolean;
}) {
  return (
    <View className="mt-4">
      <Text className="mb-1.5 text-[13px] font-semibold text-slate-700">
        {label}
      </Text>
      <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          className="h-12 flex-1 text-[15px] text-slate-900"
        />
        <Pressable onPress={onToggle} hitSlop={8}>
          <Ionicons
            name={show ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#737686"
          />
        </Pressable>
      </View>
    </View>
  );
}

export default function ChangePassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!current) return setError("Enter your current password.");
    if (next.length < MIN_LENGTH)
      return setError(
        `New password must be at least ${MIN_LENGTH} characters.`,
      );
    if (next !== confirm) return setError("The new passwords don't match.");
    if (next === current)
      return setError("New password must be different from the current one.");

    setBusy(true);
    try {
      await api("/api/me/password", {
        method: "POST",
        body: { currentPassword: current, newPassword: next },
      });
      Alert.alert(
        "Password changed",
        "Your other devices have been signed out.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Something went wrong. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        className="flex-row items-center gap-2 border-b border-slate-100 bg-white px-3 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-lg active:bg-blue-50"
        >
          <Ionicons name="arrow-back" size={24} color="#0b1c30" />
        </Pressable>
        <Text className="text-lg font-semibold text-slate-900">
          Change password
        </Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <Text className="text-[13px] text-slate-500">
          After you change it, you'll stay logged in here and be signed out on
          all other devices.
        </Text>

        <Field
          label="Current password"
          value={current}
          onChangeText={setCurrent}
          show={show}
          onToggle={() => setShow((s) => !s)}
          autoFocus
        />
        <Field
          label="New password"
          value={next}
          onChangeText={setNext}
          show={show}
          onToggle={() => setShow((s) => !s)}
        />
        <Field
          label="Confirm new password"
          value={confirm}
          onChangeText={setConfirm}
          show={show}
          onToggle={() => setShow((s) => !s)}
        />

        {error ? (
          <Text className="mt-4 text-[13px] text-red-700">{error}</Text>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={busy}
          className={`mt-6 h-12 items-center justify-center rounded-xl bg-blue-600 ${busy ? "opacity-60" : "active:bg-blue-700"}`}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-[15px] font-semibold text-white">
              Update password
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
