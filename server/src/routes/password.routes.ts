import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as password from "../controllers/password.controller.js";

export const passwordRouter = Router();

// Stops someone with a stolen session from guessing the current password
passwordRouter.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts. Wait a few minutes and try again." },
  }),
);

passwordRouter.post("/", password.changePassword);
