import { useRealtime } from "@/context/realtime";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

let count = 0;
const listeners = new Set<(n: number) => void>();

export function setNotificationCount(n: number) {
  count = Math.max(0, n);
  listeners.forEach((fn) => fn(count));
}

const refresh = () =>
  api<{ count: number }>("/api/notifications/unread-count")
    .then((r) => setNotificationCount(r.count))
    .catch(() => {});

export function useNotificationCount() {
  const [n, setN] = useState(count);
  const { subscribe } = useRealtime();

  useEffect(() => {
    listeners.add(setN);
    refresh();
    const offNew = subscribe("notification:new", (p: { unread: number }) =>
      setNotificationCount(p.unread),
    );
    const offConnect = subscribe("connect", refresh);
    return () => {
      listeners.delete(setN);
      offNew();
      offConnect();
    };
  }, [subscribe]);

  return n;
}
