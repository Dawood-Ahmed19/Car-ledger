import { toChatListing } from "./listing.view.js";
import { publicUser } from "./user.view.js";

type ChatUser = {
  id: string;
  fullName: string;
  hideFullName: boolean;
};

type ChatListing = Parameters<typeof toChatListing>[0];

export function toConversationSummary(
  conversation: {
    id: string;
    buyerId: string;
    seller: ChatUser;
    buyer: ChatUser;
    listing: ChatListing;
  },
  userId: string,
) {
  return {
    id: conversation.id,
    listing: toChatListing(conversation.listing),
    otherUser: publicUser(
      conversation.buyerId === userId ? conversation.seller : conversation.buyer,
    ),
  };
}

export function toMessage(
  message: {
    id: string;
    body: string;
    createdAt: Date;
    senderId: string;
    scamRisk: string | null;
    scamWarning: string | null;
  },
  userId: string,
) {
  const mine = message.senderId === userId;
  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    mine,
    ...(!mine && message.scamRisk
      ? { scamRisk: message.scamRisk, scamWarning: message.scamWarning }
      : {}),
  };
}

export function toConversationListItem(
  conversation: {
    id: string;
    buyerId: string;
    buyerArchived: boolean;
    sellerArchived: boolean;
    lastMessageAt: Date;
    buyer: ChatUser;
    seller: ChatUser;
    listing: ChatListing;
    messages: { body: string; createdAt: Date; senderId: string }[];
  },
  userId: string,
  unreadCount: number,
) {
  const iAmBuyer = conversation.buyerId === userId;
  const last = conversation.messages[0];
  return {
    id: conversation.id,
    role: iAmBuyer ? "buying" : "selling",
    archived: iAmBuyer ? conversation.buyerArchived : conversation.sellerArchived,
    otherUser: publicUser(iAmBuyer ? conversation.seller : conversation.buyer),
    listing: toChatListing(conversation.listing),
    lastMessage: last
      ? {
          body: last.body,
          createdAt: last.createdAt,
          mine: last.senderId === userId,
        }
      : null,
    unreadCount,
    lastMessageAt: conversation.lastMessageAt,
  };
}
