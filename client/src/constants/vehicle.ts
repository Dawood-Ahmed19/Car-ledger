import type { ComponentProps } from "react";
import type { MaterialIcons } from "@expo/vector-icons";

export type IconName = ComponentProps<typeof MaterialIcons>["name"];

export const BODY_TYPES = [
  { key: "sedan", label: "Sedan", icon: "directions-car" },
  { key: "hatchback", label: "Hatchback", icon: "directions-car" },
  { key: "suv", label: "SUV", icon: "airport-shuttle" },
  { key: "crossover", label: "Crossover", icon: "airport-shuttle" },
  { key: "pickup", label: "Pickup / Truck", icon: "local-shipping" },
  { key: "van", label: "Van / Minivan", icon: "airport-shuttle" },
  { key: "coupe", label: "Coupe", icon: "directions-car" },
] as const satisfies readonly { key: string; label: string; icon: IconName }[];

export type BodyTypeKey = (typeof BODY_TYPES)[number]["key"];

export const FUEL_TYPES = [
  { key: "petrol", label: "Petrol" },
  { key: "diesel", label: "Diesel" },
  { key: "hybrid", label: "Hybrid" },
  { key: "electric", label: "Electric" },
  { key: "cng", label: "CNG / LPG" },
] as const;

export type FuelTypeKey = (typeof FUEL_TYPES)[number]["key"];

export const bodyTypeLabel = (key?: string) =>
  BODY_TYPES.find((b) => b.key === key)?.label;

export const fuelTypeLabel = (key?: string) =>
  FUEL_TYPES.find((f) => f.key === key)?.label ?? key;

/** 4,500,000 -> "PKR 45 lakh", 12,500,000 -> "PKR 1.25 crore", 85,000 -> "PKR 85,000" */
export function formatPKR(n?: number) {
  if (n == null) return "";
  if (n >= 1e7) return `PKR ${Number((n / 1e7).toFixed(2))} crore`;
  if (n >= 1e5) return `PKR ${Number((n / 1e5).toFixed(2))} lakh`;
  return `PKR ${n.toLocaleString("en-US")}`;
}

export const formatKm = (n?: number) =>
  n == null ? undefined : `${n.toLocaleString("en-US")} km`;
