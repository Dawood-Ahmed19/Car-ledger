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

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
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
        contentContainerClassName="flex-grow justify-center gap-4 p-6"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="font-sans-bold text-3xl text-ink">Log in</Text>
        <Text className="text-sm text-ink/70">
          Welcome back. Use the email you signed up with.
        </Text>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          autoCorrect={false}
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
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
            {busy ? "Logging in…" : "Log in"}
          </Text>
        </Pressable>

        <View className="flex-row justify-center gap-1">
          <Text className="text-sm text-ink/70">New to CarLedger?</Text>
          <Link href="/signup" className="font-sans-bold text-sm text-primary">
            Create an account
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
