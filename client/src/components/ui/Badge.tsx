import { Text, View } from "react-native";
import type { ReactNode } from "react";

export type Tone =
  | "success"
  | "primary"
  | "solid"
  | "neutral"
  | "danger"
  | "warning"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum";

type BadgeProps = {
  label: string;
  tone?: Tone;
  icon?: ReactNode;
  uppercase?: boolean;
  square?: boolean;
  className?: string;
};

const box: Record<Tone, string> = {
  success: "bg-success-soft",
  primary: "bg-primary-dark/10",
  solid: "bg-primary",
  neutral: "bg-tint-300",
  danger: "bg-danger-soft",
  warning: "bg-amber-100",
  bronze: "bg-orange-100",
  silver: "bg-slate-200",
  gold: "bg-yellow-100",
  platinum: "bg-blue-100",
};

const text: Record<Tone, string> = {
  success: "text-success-on",
  primary: "text-primary-dark",
  solid: "text-white",
  neutral: "text-ink",
  danger: "text-danger",
  warning: "text-amber-900",
  bronze: "text-orange-900",
  silver: "text-slate-700",
  gold: "text-yellow-900",
  platinum: "text-blue-900",
};

export function Badge({
  label,
  tone = "neutral",
  icon,
  uppercase = false,
  square = false,
  className = "",
}: BadgeProps) {
  return (
    <View
      className={`flex-row items-center gap-1 self-start px-2 py-0.5 ${
        square ? "rounded-md" : "rounded-full"
      } ${box[tone]} ${className}`}
    >
      {icon}
      <Text
        className={`font-sans-bold text-[11px] leading-[14px] tracking-[0.44px] ${
          uppercase ? "uppercase" : ""
        } ${text[tone]}`}
      >
        {label}
      </Text>
    </View>
  );
}
