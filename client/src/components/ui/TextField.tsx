import { Text, TextInput, View, type TextInputProps } from "react-native";

export function TextField({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View className="gap-1">
      <Text className="font-sans-semibold text-sm text-ink">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#64748b"
        className="h-12 rounded-xl border border-tint-300 bg-white px-4 text-base text-ink"
        {...props}
      />
    </View>
  );
}
