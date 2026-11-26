import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as saved from "../controllers/saved.controller.js";

export const savedRouter = Router();

savedRouter.get("/", requireAuth, saved.list);
savedRouter.get("/updates", requireAuth, saved.updates);
savedRouter.put("/:listingId", requireAuth, saved.save);
savedRouter.delete("/:listingId", requireAuth, saved.remove);
savedRouter.post("/:listingId/seen", requireAuth, saved.seen);
