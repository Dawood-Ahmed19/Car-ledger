import { Pressable, Text, type PressableProps } from "react-native";
import type { ReactNode } from "react";

type Variant = "primary" | "tint" | "soft";

type ButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  variant?: Variant;
  icon?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
};

const container: Record<Variant, string> = {
  primary: "bg-primary",
  tint: "bg-tint-100",
  soft: "bg-tint-50",
};

const labelColor: Record<Variant, string> = {
  primary: "text-white",
  tint: "text-ink",
  soft: "text-muted",
};

export function Button({
  label,
  variant = "primary",
  icon,
  iconRight,
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-lg px-4 active:opacity-80 ${container[variant]} ${disabled ? "opacity-50" : ""} ${className}`}
      {...rest}
    >
      {icon}
      <Text className={`font-sans-semibold text-xs ${labelColor[variant]}`}>
        {label}
      </Text>
      {iconRight}
    </Pressable>
  );
}
