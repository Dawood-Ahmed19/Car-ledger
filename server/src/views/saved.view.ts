import { toListing } from "./listing.view.js";

export function changesOf(
  saved: { seenStatus: string; seenPrice: number },
  listing: { status: string; price: number },
) {
  const changes: ("status" | "price")[] = [];
  if (saved.seenStatus !== listing.status) changes.push("status");
  if (saved.seenPrice !== listing.price) changes.push("price");
  return changes;
}

export function toSavedEntry(row: {
  seenStatus: string;
  seenPrice: number;
  listing: Parameters<typeof toListing>[0];
}) {
  return {
    listing: { ...toListing(row.listing), isSaved: true },
    changes: changesOf(row, row.listing),
  };
}
