import { Text, View } from "react-native";

export function ScamBanner({
  risk,
  warning,
}: {
  risk: "low" | "high";
  warning: string;
}) {
  const high = risk === "high";
  return (
    <View
      className={`mt-1 max-w-[85%] self-start rounded-lg border p-3 ${
        high ? "border-red-500 bg-red-50" : "border-amber-500 bg-amber-50"
      }`}
    >
      <Text className={`font-bold ${high ? "text-red-700" : "text-amber-700"}`}>
        {high ? "⚠️ Possible scam" : "Be careful"}
      </Text>
      <Text className="mt-0.5 text-gray-800">{warning}</Text>
    </View>
  );
}
