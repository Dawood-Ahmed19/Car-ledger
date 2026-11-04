import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/context/auth";
import { ApiError } from "@/lib/api";

type Role = "buyer" | "seller";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [role, setRole] = useState<Role>("buyer");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (busy) return;
    if (form.password !== form.confirm)
      return setError("The two passwords do not match.");
    setError(null);
    setBusy(true);
    try {
      await signUp({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role,
      });
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Something went wrong. Try again.",
      );
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="gap-4 p-6 pt-14"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="font-sans-bold text-3xl text-ink">
          Create your account
        </Text>

        <View className="flex-row gap-2">
          {(
            [
              ["buyer", "Buy a car"],
              ["seller", "Sell a car"],
            ] as const
          ).map(([value, label]) => {
            const active = role === value;
            return (
              <Pressable
                key={value}
                onPress={() => setRole(value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className={`h-11 justify-center rounded-full border px-5 ${active ? "border-primary bg-primary" : "border-tint-300 bg-white"}`}
              >
                <Text
                  className={`font-sans-semibold text-sm ${active ? "text-white" : "text-ink"}`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextField
          label="Full name"
          value={form.fullName}
          onChangeText={set("fullName")}
          autoComplete="name"
          textContentType="name"
        />
        <TextField
          label="Email"
          value={form.email}
          onChangeText={set("email")}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          autoCorrect={false}
        />
        <TextField
          label="Mobile number"
          value={form.phone}
          onChangeText={set("phone")}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="03001234567"
        />
        <TextField
          label="Password"
          value={form.password}
          onChangeText={set("password")}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          label="Confirm password"
          value={form.confirm}
          onChangeText={set("confirm")}
          secureTextEntry
          autoComplete="new-password"
          onSubmitEditing={submit}
          returnKeyType="go"
        />

        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            className="text-sm text-danger"
          >
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={busy}
          accessibilityRole="button"
          className={`h-12 items-center justify-center rounded-xl bg-primary active:opacity-80 ${busy ? "opacity-60" : ""}`}
        >
          <Text className="font-sans-bold text-base text-white">
            {busy ? "Creating account…" : "Create account"}
          </Text>
        </Pressable>

        <View className="flex-row justify-center gap-1">
          <Text className="text-sm text-ink/70">Already registered?</Text>
          <Link href="/login" className="font-sans-bold text-sm text-primary">
            Log in
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
