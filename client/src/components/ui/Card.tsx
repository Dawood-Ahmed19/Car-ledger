import { View, type ViewProps } from "react-native";

type Variant = "default" | "tint" | "banner" | "inset";

type CardProps = ViewProps & {
  variant?: Variant;
  className?: string;
};

const styles: Record<Variant, string> = {
  default: "bg-white rounded-xl p-3 shadow-sm",
  tint: "bg-tint-50 rounded-xl p-3",
  banner: "bg-tint-100 rounded-xl p-3",
  inset: "bg-canvas rounded-lg p-2",
};

export function Card({
  variant = "default",
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <View className={`${styles[variant]} ${className}`} {...rest}>
      {children}
    </View>
  );
}
