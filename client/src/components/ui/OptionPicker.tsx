import { Pressable, Text, View } from "react-native";

type Option<K extends string> = { key: K; label: string };

export function OptionPicker<K extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: readonly Option<K>[];
  value: K | null;
  onChange: (key: K) => void;
  error?: string;
}) {
  return (
    <View className="gap-2">
      <Text className="text-[13px] font-semibold text-[#0b1c30]">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.key;
          return (
            <Pressable
              key={o.key}
              onPress={() => onChange(o.key)}
              className={`px-3.5 py-2 rounded-full border ${
                active
                  ? "bg-[#004ac6] border-[#004ac6]"
                  : "bg-white border-[#c3c6d7]"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${active ? "text-white" : "text-[#434655]"}`}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text className="text-xs text-[#ba1a1a]">{error}</Text> : null}
    </View>
  );
}
