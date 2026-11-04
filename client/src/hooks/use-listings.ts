import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api, assetUrl } from "../lib/api";
import type { Listing } from "../Types";

export function toClientListing(l: Listing): Listing {
  return {
    ...l,
    imageUrl: l.imageUrl ? assetUrl(l.imageUrl) : undefined,
    photos: l.photos?.map(assetUrl),
  };
}

export function useListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ listings: Listing[] }>("/api/listings");
      setListings(res.listings.map(toClientListing));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load listings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return { listings, loading, refreshing, error, refresh };
}
