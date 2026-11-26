import type { NextFunction, Request, Response } from "express";
import { isUuid } from "../lib/uuid.js";
import * as notificationModel from "../models/notification.model.js";
import { toNotification } from "../views/notification.view.js";

// List my notifications (newest first) plus the unread count
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const [rows, unread] = await Promise.all([
      notificationModel.listRecent(userId),
      notificationModel.countUnread(userId),
    ]);
    res.json({ unread, items: rows.map(toNotification) });
  } catch (e) {
    next(e);
  }
}

// Just the number, for the red dot on the bell
export async function unreadCount(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const count = await notificationModel.countUnread(req.user!.id);
    res.json({ count });
  } catch (e) {
    next(e);
  }
}

// Mark everything read (POST because your api() helper only supports GET/POST/DELETE)
export async function readAll(req: Request, res: Response, next: NextFunction) {
  try {
    await notificationModel.markAllRead(req.user!.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

// Mark one read
export async function readOne(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    if (!isUuid(id))
      return res.status(400).json({ error: "Invalid notification." });
    await notificationModel.markRead(id, req.user!.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

// Delete one
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    if (!isUuid(id))
      return res.status(400).json({ error: "Invalid notification." });
    await notificationModel.remove(id, req.user!.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
