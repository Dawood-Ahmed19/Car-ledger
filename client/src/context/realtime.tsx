import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import { io, type Socket } from "socket.io-client";
import type * as NotificationsType from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { api, BASE, getAuthToken, onAuthTokenChange } from "@/lib/api";

// Expo Go (or a build without the native module) throws when expo-notifications
// is imported. Load it safely so the rest of the app keeps working.
const Notifications: typeof NotificationsType | null = (() => {
  try {
    return require("expo-notifications");
  } catch {
    console.log("expo-notifications unavailable (Expo Go?). Push disabled.");
    return null;
  }
})();

// Hooks must be called unconditionally, so fall back to a no-op hook.
const useLastNotificationResponse: () =>
  | NotificationsType.NotificationResponse
  | null
  | undefined = Notifications?.useLastNotificationResponse ?? (() => null);

// The chat screen sets this so no banner shows for the chat you're already looking at.
let activeConversation: string | null = null;
export const setActiveConversation = (id: string | null) => {
  activeConversation = id;
};

Notifications?.setNotificationHandler({
  handleNotification: async (n) => {
    const cid = n.request.content.data?.conversationId;
    const hide = !!cid && cid === activeConversation;
    return {
      shouldShowBanner: !hide,
      shouldShowList: !hide,
      shouldPlaySound: false,
      shouldSetBadge: true,
    };
  },
});

const projectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

async function registerForPush() {
  try {
    if (!Notifications || !Device.isDevice) return; // push needs a real phone + native module
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("messages", {
        name: "Messages",
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== "granted") return;

    const id = projectId();
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      id ? { projectId: id } : undefined,
    );
    await api("/api/push-token", { method: "POST", body: { token } });
  } catch {
    /* push is optional; never block the app */
  }
}

// Call right before logging the user out so the old account stops getting pushes on this phone.
export async function unregisterPush() {
  try {
    if (!Notifications) return;
    const id = projectId();
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      id ? { projectId: id } : undefined,
    );
    await api("/api/push-token/remove", { method: "POST", body: { token } });
  } catch {}
}

type Handler = (...args: any[]) => void;
type Ctx = {
  unread: number;
  subscribe: (event: string, fn: Handler) => () => void;
};

const RealtimeContext = createContext<Ctx>({
  unread: 0,
  subscribe: () => () => {},
});
export const useRealtime = () => useContext(RealtimeContext);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const listeners = useRef(new Map<string, Set<Handler>>());

  const dispatch = useCallback((event: string, ...args: any[]) => {
    listeners.current.get(event)?.forEach((fn) => fn(...args));
  }, []);

  const subscribe = useCallback((event: string, fn: Handler) => {
    if (!listeners.current.has(event)) listeners.current.set(event, new Set());
    listeners.current.get(event)!.add(fn);
    return () => {
      listeners.current.get(event)?.delete(fn);
    };
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const { count } = await api<{ count: number }>(
        "/api/conversations/unread-count",
      );
      setUnread(count);
    } catch {}
  }, []);

  useEffect(() => {
    const disconnect = () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      tokenRef.current = null;
    };

    const connect = () => {
      const token = getAuthToken();
      if (!token) {
        disconnect();
        setUnread(0);
        return;
      }
      if (socketRef.current?.active && tokenRef.current === token) return;
      disconnect();
      tokenRef.current = token;

      const socket = io(BASE, { auth: { token }, transports: ["websocket"] });
      socketRef.current = socket;
      socket.on("connect", () => {
        refreshUnread(); // catch up on anything missed while offline
        dispatch("connect");
      });
      socket.on("unread:update", ({ count }: { count: number }) =>
        setUnread(count),
      );
      socket.onAny((event, ...args) => dispatch(event, ...args));
    };

    connect();
    if (getAuthToken()) registerForPush();

    const offToken = onAuthTokenChange((t) => {
      connect();
      if (t) registerForPush();
    });

    // Foreground = live socket. Background = disconnect, so the server sends a push instead.
    const appSub = AppState.addEventListener("change", (next) => {
      if (next === "active") connect();
      else if (next === "background") disconnect();
    });

    return () => {
      offToken();
      appSub.remove();
      disconnect();
    };
  }, [dispatch, refreshUnread]);

  // app icon badge follows the unread count
  useEffect(() => {
    Notifications?.setBadgeCountAsync(unread).catch(() => {});
  }, [unread]);

  // tapping a notification opens that chat (also from a cold start)
  const lastResponse = useLastNotificationResponse();
  useEffect(() => {
    if (!Notifications) return;
    const cid = lastResponse?.notification.request.content.data?.conversationId;
    if (
      cid &&
      lastResponse?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const t = setTimeout(() => router.push(`/chat/${cid}` as any), 300);
      return () => clearTimeout(t);
    }
  }, [lastResponse]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({ unread, subscribe }), [unread, subscribe]);
  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}
