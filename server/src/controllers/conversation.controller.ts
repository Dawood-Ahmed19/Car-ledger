import type { Request, Response } from "express";
import { isUuid } from "../lib/uuid.js";
import * as conversationModel from "../models/conversation.model.js";
import * as listingModel from "../models/listing.model.js";
import { getPrefs } from "../models/user.model.js";
import { notify } from "../services/notify.js";
import { sendPush } from "../services/push.js";
import { emitToUser, isOnline } from "../services/realtime.js";
import { checkMessage } from "../services/scamCheck.js";
import {
  toConversationListItem,
  toConversationSummary,
  toMessage,
} from "../views/conversation.view.js";
import { displayName } from "../views/user.view.js";

type Conversation = NonNullable<
  Awaited<ReturnType<typeof conversationModel.findForMember>>
>;

async function markRead(conversationId: string, userId: string) {
  const { count } = await conversationModel.markIncomingRead(
    conversationId,
    userId,
  );
  if (count > 0) {
    emitToUser(userId, "unread:update", {
      count: await conversationModel.countUnread(userId),
    });
  }
}

// Runs after the response is sent. Never throws, so it can't break chat.
async function runScamCheck(
  conversation: Conversation,
  messageId: string,
  recipientId: string,
) {
  try {
    const recent = await conversationModel.recentMessages(conversation.id);
    const history = recent.reverse().map((message) => ({
      role: (message.senderId === conversation.buyerId ? "buyer" : "seller") as
        | "buyer"
        | "seller",
      text: message.body.slice(0, 500),
    }));

    const result = await checkMessage({
      history,
      listing: {
        title: conversation.listing.title,
        price: `PKR ${conversation.listing.price}`,
      },
      senderId:
        conversation.buyerId === recipientId
          ? conversation.sellerId
          : conversation.buyerId,
    });
    if (result.risk === "none") return;

    await conversationModel.flagScam(messageId, result.risk, result.warning);

    const prefs = await getPrefs(recipientId);

    // only the recipient is warned, never the sender
    emitToUser(recipientId, "message:warning", {
      conversationId: conversation.id,
      messageId,
      risk: result.risk,
      warning: result.warning,
      alert: prefs.notifyScam, // false = no pop-up; the banner under the message still shows
    });

    // high-risk warnings also go into the notification center (the bell).
    // notify() checks the "Scam warnings" switch itself.
    if (result.risk === "high") {
      await notify(recipientId, {
        type: "scam",
        title: "Possible scam message",
        body:
          result.warning ?? "A message in one of your chats looks suspicious.",
        data: { conversationId: conversation.id },
        push: false,
      });
    }
  } catch (e) {
    console.error("scam check failed", e);
  }
}

export async function unreadCount(req: Request, res: Response) {
  res.json({ count: await conversationModel.countUnread(req.user!.id) });
}

export async function list(req: Request, res: Response) {
  const userId = req.user!.id;
  const conversations = await conversationModel.listForUser(userId);
  const unread = await conversationModel.unreadByConversation(
    conversations.map((conversation) => conversation.id),
    userId,
  );
  const unreadMap = new Map(
    unread.map((row) => [row.conversationId, row._count._all]),
  );

  res.json(
    conversations.map((conversation) =>
      toConversationListItem(
        conversation,
        userId,
        unreadMap.get(conversation.id) ?? 0,
      ),
    ),
  );
}

export async function open(req: Request, res: Response) {
  const userId = req.user!.id;
  const listingId = String(req.body?.listingId ?? "");
  if (!isUuid(listingId))
    return res.status(400).json({ error: "Invalid listing." });

  const listing = await listingModel.findById(listingId);
  if (!listing) return res.status(404).json({ error: "Listing not found." });
  if (listing.sellerId === userId)
    return res
      .status(400)
      .json({ error: "You can't message your own listing." });

  const conversation = await conversationModel.openForListing(
    listingId,
    userId,
    listing.sellerId,
  );
  res.json({ id: conversation.id });
}

export async function messages(req: Request, res: Response) {
  const userId = req.user!.id;
  const conversation = await conversationModel.findForMember(
    String(req.params.id),
    userId,
  );
  if (!conversation)
    return res.status(404).json({ error: "Conversation not found." });

  await markRead(conversation.id, userId);
  const rows = await conversationModel.listMessages(conversation.id);

  res.json({
    conversation: toConversationSummary(conversation, userId),
    messages: rows.map((message) => toMessage(message, userId)),
  });
}

export async function read(req: Request, res: Response) {
  const userId = req.user!.id;
  const conversation = await conversationModel.findForMember(
    String(req.params.id),
    userId,
  );
  if (!conversation)
    return res.status(404).json({ error: "Conversation not found." });

  await markRead(conversation.id, userId);
  res.json({ ok: true });
}

export async function send(req: Request, res: Response) {
  const userId = req.user!.id;
  const body = String(req.body?.body ?? "").trim();
  if (!body || body.length > 2000)
    return res
      .status(400)
      .json({ error: "Message must be 1 to 2000 characters." });

  const conversation = await conversationModel.findForMember(
    String(req.params.id),
    userId,
  );
  if (!conversation)
    return res.status(404).json({ error: "Conversation not found." });

  const [message] = await conversationModel.sendMessage(
    conversation.id,
    userId,
    body,
  );
  const recipientId =
    conversation.buyerId === userId
      ? conversation.sellerId
      : conversation.buyerId;
  const base = { id: message.id, body: message.body, createdAt: message.createdAt };

  // instant delivery (the sender gets it too so their other devices stay in sync)
  emitToUser(recipientId, "message:new", {
    conversationId: conversation.id,
    message: { ...base, mine: false },
  });
  emitToUser(userId, "message:new", {
    conversationId: conversation.id,
    message: { ...base, mine: true },
  });

  const unread = await conversationModel.countUnread(recipientId);
  emitToUser(recipientId, "unread:update", { count: unread });

  // push only if they want it AND have no live socket (app closed or in the background)
  const prefs = await getPrefs(recipientId);
  if (prefs.notifyMessages && !(await isOnline(recipientId))) {
    void sendPush(recipientId, {
      title: displayName(
        conversation.buyerId === userId ? conversation.buyer : conversation.seller,
      ),
      body: body.length > 120 ? `${body.slice(0, 117)}…` : body,
      data: { conversationId: conversation.id },
      badge: unread,
    });
  }

  res.status(201).json({ ...base, mine: true });

  // fire and forget: runs after the sender already has their response
  void runScamCheck(conversation, message.id, recipientId);
}

// Archive / unarchive for me only (POST because your api() helper only supports GET/POST)
export async function archive(req: Request, res: Response) {
  const userId = req.user!.id;
  const conversation = await conversationModel.findForMember(
    String(req.params.id),
    userId,
  );
  if (!conversation)
    return res.status(404).json({ error: "Conversation not found." });

  await conversationModel.setArchived(
    conversation.id,
    conversation.buyerId === userId,
    !!req.body?.archived,
  );
  res.json({ ok: true });
}
