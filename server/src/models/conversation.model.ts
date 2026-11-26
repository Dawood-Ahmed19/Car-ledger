import { prisma } from "../prisma.js";
import { isUuid } from "../lib/uuid.js";

const userSelect = { id: true, fullName: true, hideFullName: true } as const;

export const conversationInclude = {
  listing: true,
  buyer: { select: userSelect },
  seller: { select: userSelect },
} as const;

export function countUnread(userId: string) {
  return prisma.message.count({
    where: {
      senderId: { not: userId },
      readAt: null,
      conversation: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    },
  });
}

export async function markIncomingRead(conversationId: string, userId: string) {
  return prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function findForMember(id: string, userId: string) {
  if (!isUuid(id)) return null;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: conversationInclude,
  });
  if (
    !conversation ||
    (conversation.buyerId !== userId && conversation.sellerId !== userId)
  ) {
    return null;
  }
  return conversation;
}

export function listForUser(userId: string) {
  return prisma.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    orderBy: { lastMessageAt: "desc" },
    include: {
      ...conversationInclude,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export function unreadByConversation(conversationIds: string[], userId: string) {
  return prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversationIds },
      senderId: { not: userId },
      readAt: null,
    },
    _count: { _all: true },
  });
}

export function openForListing(
  listingId: string,
  buyerId: string,
  sellerId: string,
) {
  return prisma.conversation.upsert({
    where: { listingId_buyerId: { listingId, buyerId } },
    update: {},
    create: { listingId, buyerId, sellerId },
  });
}

export function listMessages(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}

export function recentMessages(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
}

export function sendMessage(conversationId: string, senderId: string, body: string) {
  return prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId, body },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      // new activity brings the thread back for both people
      data: {
        lastMessageAt: new Date(),
        buyerArchived: false,
        sellerArchived: false,
      },
    }),
  ]);
}

export function flagScam(id: string, risk: string, warning: string | null) {
  return prisma.message.update({
    where: { id },
    data: { scamRisk: risk, scamWarning: warning, scamCheckedAt: new Date() },
  });
}

export function setArchived(id: string, asBuyer: boolean, archived: boolean) {
  return prisma.conversation.update({
    where: { id },
    data: asBuyer ? { buyerArchived: archived } : { sellerArchived: archived },
  });
}
