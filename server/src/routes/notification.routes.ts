import { Router } from "express";
import * as notification from "../controllers/notification.controller.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", notification.list);
notificationsRouter.get("/unread-count", notification.unreadCount);
notificationsRouter.post("/read-all", notification.readAll);
notificationsRouter.post("/:id/read", notification.readOne);
notificationsRouter.delete("/:id", notification.remove);
