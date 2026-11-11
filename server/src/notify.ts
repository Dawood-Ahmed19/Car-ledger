import { prisma } from "./prisma.js";
import { emitToUser, isOnline } from "./realtime.js";
import { sendPush } from "./push.js";

export type NotificationType = "scam" | "evidence" | "listing";

// Which Settings switch controls which type
const PREF = {
  scam: "notifyScam",
  evidence: "notifyEvidence",
  listing: "notifyEvidence",
} as const;

export async function notify(
  userId: string,
  n: {
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, string>; // e.g. { conversationId } or { listingId }, used to open the right screen
    push?: boolean; // default true; set false when another push already covers it
  },
) {
  try {
    // respect the user's Settings switch: if it's off, no notification at all
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notifyScam: true, notifyEvidence: true },
    });
    if (!user || user[PREF[n.type]] === false) return null;

    const row = await prisma.notification.create({
      data: {
        userId,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data ?? undefined,
      },
    });

    const unread = await prisma.notification.count({
      where: { userId, readAt: null },
    });

    // live update for the bell
    emitToUser(userId, "notification:new", {
      notification: {
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        data: row.data,
        createdAt: row.createdAt,
        read: false,
      },
      unread,
    });

    // push only when the app isn't open
    if (n.push !== false && !(await isOnline(userId))) {
      void sendPush(userId, {
        title: n.title,
        body: n.body,
        data: n.data ?? {},
      });
    }
    return row;
  } catch (e) {
    // a failed notification must never break the action that caused it
    console.error("notify failed", e);
    return null;
  }
}
