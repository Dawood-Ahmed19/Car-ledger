function priceLabel(n: number) {
  if (n >= 1_000_000)
    return `PKR ${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  return `PKR ${n.toLocaleString("en-PK")}`;
}

export function toListing(listing: {
  id: string;
  title: string;
  price: number;
  mileageKm: number;
  city: string;
  about: string;
  bodyType: string | null;
  fuelType: string | null;
  status: string;
  evidence: string[];
  photos: string[];
  sellerId: string;
  photoCheck?: string;
}) {
  return {
    id: listing.id,
    title: listing.title,
    price: listing.price,
    mileageKm: listing.mileageKm,
    priceLabel: priceLabel(listing.price),
    mileageLabel: `${listing.mileageKm.toLocaleString("en-PK")} km`,
    city: listing.city,
    about: listing.about,
    bodyType: listing.bodyType,
    fuelType: listing.fuelType,
    status: listing.status,
    evidence: listing.evidence,
    photos: listing.photos,
    imageUrl: listing.photos[0],
    sellerId: listing.sellerId,
    sellerTier: null,
    photoCheck: listing.photoCheck ?? "passed", // "pending" = photos not checked by the AI yet
  };
}

export function toChatListing(listing: {
  id: string;
  title: string;
  price: number;
  city: string;
  photos: string[];
  status: string;
}) {
  return {
    id: listing.id,
    title: listing.title,
    price: listing.price,
    city: listing.city,
    photoUrl: listing.photos[0] ?? null, // relative path; the app wraps it with assetUrl()
    evidenceStatus: listing.status, // verified | under_review | not_checked | recalled | removed
  };
}
