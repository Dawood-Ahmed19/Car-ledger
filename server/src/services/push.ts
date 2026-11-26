import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import * as pushTokenModel from "../models/pushToken.model.js";

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
  const rows = await pushTokenModel.listForUser(userId);
  const messages: ExpoPushMessage[] = rows
    .filter((row) => Expo.isExpoPushToken(row.token))
    .map((row) => ({
      to: row.token,
      sound: "default",
      channelId: "messages",
      ...msg,
    }));
  if (!messages.length) return;

  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      // remove tokens Expo says no longer exist (app uninstalled etc.)
      const dead = tickets.flatMap((ticket, i) =>
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered"
          ? [chunk[i].to as string]
          : [],
      );
      if (dead.length) await pushTokenModel.deleteTokens(dead);
    } catch (e) {
      console.error("push failed", e);
    }
  }
}
