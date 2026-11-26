import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as conversation from "../controllers/conversation.controller.js";

export const conversationsRouter = Router();

conversationsRouter.get("/unread-count", asyncHandler(conversation.unreadCount));
conversationsRouter.get("/", asyncHandler(conversation.list));
conversationsRouter.post("/", asyncHandler(conversation.open));
conversationsRouter.get("/:id/messages", asyncHandler(conversation.messages));
conversationsRouter.post("/:id/read", asyncHandler(conversation.read));
conversationsRouter.post("/:id/messages", asyncHandler(conversation.send));
conversationsRouter.post("/:id/archive", asyncHandler(conversation.archive));
