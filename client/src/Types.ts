export type ListingStatus =
  | "verified"
  | "under_review"
  | "not_checked"
  | "recalled"
  | "removed";

export type Tier = "bronze" | "silver" | "gold" | "platinum";

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  priceLabel: string;
  price: number;
  mileageKm: number;
  mileageLabel: string;
  city: string;
  status: ListingStatus;
  sellerTier: Tier | null;
  imageUrl?: string;
  about?: string;
  evidence?: string[];
  photos?: string[];
  bodyType?: string | null;
  fuelType?: string | null;
  isSaved?: boolean;
}
