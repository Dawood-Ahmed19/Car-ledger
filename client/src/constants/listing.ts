import type { Tone } from "../components/ui/Badge";
import type { ListingStatus, Tier } from "../types";

export const STATUS_BADGE: Record<
  ListingStatus,
  { label: string; tone: Tone }
> = {
  verified: { label: "Verified", tone: "success" },
  under_review: { label: "Under review", tone: "warning" },
  not_checked: { label: "Not yet checked", tone: "neutral" },
  recalled: { label: "Evidence recalled", tone: "danger" },
  removed: { label: "Removed", tone: "danger" },
};

export const TIER_BADGE: Record<
  Tier,
  { label: string; tone: Tone; dot: string }
> = {
  bronze: { label: "Bronze seller", tone: "bronze", dot: "bg-orange-700" },
  silver: { label: "Silver seller", tone: "silver", dot: "bg-slate-500" },
  gold: { label: "Gold seller", tone: "gold", dot: "bg-yellow-600" },
  platinum: { label: "Platinum seller", tone: "platinum", dot: "bg-blue-700" },
};
