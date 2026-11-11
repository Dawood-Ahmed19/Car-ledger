import { Router } from "express";
import { prisma } from "../prisma.js";

export const notificationsRouter = Router();

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// List my notifications (newest first) plus the unread count
notificationsRouter.get("/", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const [rows, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    res.json({
      unread,
      items: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        createdAt: n.createdAt,
        read: n.readAt !== null,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// Just the number, for the red dot on the bell
notificationsRouter.get("/unread-count", async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, readAt: null },
    });
    res.json({ count });
  } catch (e) {
    next(e);
  }
});

// Mark everything read (POST because your api() helper only supports GET/POST/DELETE)
notificationsRouter.post("/read-all", async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Mark one read
notificationsRouter.post("/:id/read", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (!isUuid(id))
      return res.status(400).json({ error: "Invalid notification." });
    await prisma.notification.updateMany({
      where: { id, userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Delete one
notificationsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (!isUuid(id))
      return res.status(400).json({ error: "Invalid notification." });
    await prisma.notification.deleteMany({
      where: { id, userId: req.user!.id },
    });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
