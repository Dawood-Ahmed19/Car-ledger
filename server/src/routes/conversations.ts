import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { prisma } from "../prisma.js";
import { emitToUser, isOnline } from "../realtime.js";
import { sendPush } from "../push.js";

export const conversationsRouter = Router();

const uid = (req: Request) => req.user!.id;
const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// catches async errors so they reach your error handler on any Express version
const h =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

function serializeListing(l: {
  id: string;
  title: string;
  price: number;
  city: string;
  photos: string[];
  status: string;
}) {
  return {
    id: l.id,
    title: l.title,
    price: l.price,
    city: l.city,
    photoUrl: l.photos[0] ?? null, // relative path; the app wraps it with assetUrl()
    evidenceStatus: l.status, // verified | under_review | not_checked | recalled | removed
  };
}

const userSelect = { id: true, fullName: true } as const;
const publicUser = (u: { id: string; fullName: string }) => ({
  id: u.id,
  name: u.fullName,
});

const convInclude = {
  listing: true,
  buyer: { select: userSelect },
  seller: { select: userSelect },
} as const;

async function getMine(id: string, userId: string) {
  if (!isUuid(id)) return null;
  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: convInclude,
  });
  if (!conv || (conv.buyerId !== userId && conv.sellerId !== userId))
    return null;
  return conv;
}

export async function unreadCount(userId: string) {
  return prisma.message.count({
    where: {
      senderId: { not: userId },
      readAt: null,
      conversation: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    },
  });
}

// Marks incoming messages as read and tells the user's devices their new unread total
async function markRead(conversationId: string, userId: string) {
  const { count } = await prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
  if (count > 0)
    emitToUser(userId, "unread:update", { count: await unreadCount(userId) });
}

// Total unread (for the tab badge)
conversationsRouter.get(
  "/unread-count",
  h(async (req, res) => {
    res.json({ count: await unreadCount(uid(req)) });
  }),
);

// List my conversations
conversationsRouter.get(
  "/",
  h(async (req, res) => {
    const userId = uid(req);
    const convs = await prisma.conversation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { lastMessageAt: "desc" },
      include: {
        ...convInclude,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    const unread = await prisma.message.groupBy({
      by: ["conversationId"],
      where: {
        conversationId: { in: convs.map((c) => c.id) },
        senderId: { not: userId },
        readAt: null,
      },
      _count: { _all: true },
    });
    const unreadMap = new Map(
      unread.map((u) => [u.conversationId, u._count._all]),
    );

    res.json(
      convs.map((c) => {
        const iAmBuyer = c.buyerId === userId;
        const last = c.messages[0];
        return {
          id: c.id,
          role: iAmBuyer ? "buying" : "selling",
          archived: iAmBuyer ? c.buyerArchived : c.sellerArchived,
          otherUser: publicUser(iAmBuyer ? c.seller : c.buyer),
          listing: serializeListing(c.listing),
          lastMessage: last
            ? {
                body: last.body,
                createdAt: last.createdAt,
                mine: last.senderId === userId,
              }
            : null,
          unreadCount: unreadMap.get(c.id) ?? 0,
          lastMessageAt: c.lastMessageAt,
        };
      }),
    );
  }),
);

// Start (or reuse) a conversation from a listing
conversationsRouter.post(
  "/",
  h(async (req, res) => {
    const userId = uid(req);
    const listingId = String(req.body?.listingId ?? "");
    if (!isUuid(listingId))
      return res.status(400).json({ error: "Invalid listing." });

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) return res.status(404).json({ error: "Listing not found." });
    if (listing.sellerId === userId)
      return res
        .status(400)
        .json({ error: "You can't message your own listing." });

    const conv = await prisma.conversation.upsert({
      where: { listingId_buyerId: { listingId, buyerId: userId } },
      update: {},
      create: { listingId, buyerId: userId, sellerId: listing.sellerId },
    });
    res.json({ id: conv.id });
  }),
);

// Messages in a conversation (marks incoming as read)
conversationsRouter.get(
  "/:id/messages",
  h(async (req, res) => {
    const userId = uid(req);
    const conv = await getMine(String(req.params.id), userId);
    if (!conv)
      return res.status(404).json({ error: "Conversation not found." });

    await markRead(conv.id, userId);

    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "asc" },
    });

    res.json({
      conversation: {
        id: conv.id,
        listing: serializeListing(conv.listing),
        otherUser: publicUser(
          conv.buyerId === userId ? conv.seller : conv.buyer,
        ),
      },
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt,
        mine: m.senderId === userId,
      })),
    });
  }),
);

// Mark a conversation as read (the chat screen calls this when a message arrives while it's open)
conversationsRouter.post(
  "/:id/read",
  h(async (req, res) => {
    const userId = uid(req);
    const conv = await getMine(String(req.params.id), userId);
    if (!conv)
      return res.status(404).json({ error: "Conversation not found." });

    await markRead(conv.id, userId);
    res.json({ ok: true });
  }),
);

// Send a message
conversationsRouter.post(
  "/:id/messages",
  h(async (req, res) => {
    const userId = uid(req);
    const body = String(req.body?.body ?? "").trim();
    if (!body || body.length > 2000)
      return res
        .status(400)
        .json({ error: "Message must be 1 to 2000 characters." });

    const conv = await getMine(String(req.params.id), userId);
    if (!conv)
      return res.status(404).json({ error: "Conversation not found." });

    const [m] = await prisma.$transaction([
      prisma.message.create({
        data: { conversationId: conv.id, senderId: userId, body },
      }),
      prisma.conversation.update({
        where: { id: conv.id },
        // new activity brings the thread back for both people
        data: {
          lastMessageAt: new Date(),
          buyerArchived: false,
          sellerArchived: false,
        },
      }),
    ]);

    const recipientId = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
    const base = { id: m.id, body: m.body, createdAt: m.createdAt };

    // instant delivery (the sender gets it too so their other devices stay in sync)
    emitToUser(recipientId, "message:new", {
      conversationId: conv.id,
      message: { ...base, mine: false },
    });
    emitToUser(userId, "message:new", {
      conversationId: conv.id,
      message: { ...base, mine: true },
    });

    const unread = await unreadCount(recipientId);
    emitToUser(recipientId, "unread:update", { count: unread });

    // push only if they have no live socket (app closed or in the background)
    if (!(await isOnline(recipientId))) {
      void sendPush(recipientId, {
        title: req.user!.fullName,
        body: body.length > 120 ? `${body.slice(0, 117)}…` : body,
        data: { conversationId: conv.id },
        badge: unread,
      });
    }

    res.status(201).json({ ...base, mine: true });
  }),
);

// Archive / unarchive for me only (POST because your api() helper only supports GET/POST)
conversationsRouter.post(
  "/:id/archive",
  h(async (req, res) => {
    const userId = uid(req);
    const conv = await getMine(String(req.params.id), userId);
    if (!conv)
      return res.status(404).json({ error: "Conversation not found." });

    const archived = !!req.body?.archived;
    await prisma.conversation.update({
      where: { id: conv.id },
      data:
        conv.buyerId === userId
          ? { buyerArchived: archived }
          : { sellerArchived: archived },
    });
    res.json({ ok: true });
  }),
);
