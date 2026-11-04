import { api } from "@/lib/api";

export const saveListing = (id: string) =>
  api(`/api/saved/${id}`, { method: "PUT" });

export const unsaveListing = (id: string) =>
  api(`/api/saved/${id}`, { method: "DELETE" });

export const markSeen = (id: string) =>
  api(`/api/saved/${id}/seen`, { method: "POST" });

export const fetchUpdateCount = async () =>
  (await api<{ count: number }>("/api/saved/updates")).count;
