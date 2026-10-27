import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "./prisma.js";

const expo = new Expo();

export async function sendPush(
  userId: string,
  msg: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    badge?: number;
  },
) {
  const rows = await prisma.pushToken.findMany({ where: { userId } });
  const messages: ExpoPushMessage[] = rows
    .filter((r) => Expo.isExpoPushToken(r.token))
    .map((r) => ({
      to: r.token,
      sound: "default",
      channelId: "messages",
      ...msg,
    }));
  if (!messages.length) return;

  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      // remove tokens Expo says no longer exist (app uninstalled etc.)
      const dead = tickets.flatMap((t, i) =>
        t.status === "error" && t.details?.error === "DeviceNotRegistered"
          ? [chunk[i].to as string]
          : [],
      );
      if (dead.length)
        await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
    } catch (e) {
      console.error("push failed", e);
    }
  }
}
