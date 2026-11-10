import { Router } from "express";
import rateLimit from "express-rate-limit";
import { hash, verify } from "@node-rs/argon2";
import { prisma } from "../prisma.js";
import { bearerToken, revokeOtherTokens } from "../session.js";

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

const MIN_LENGTH = 8; // keep this the same as your signup rule in schemas.ts
const MAX_LENGTH = 128;

passwordRouter.post("/", async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword ?? "");
    const newPassword = String(req.body?.newPassword ?? "");

    if (newPassword.length < MIN_LENGTH)
      return res.status(400).json({
        error: `New password must be at least ${MIN_LENGTH} characters.`,
      });
    if (newPassword.length > MAX_LENGTH)
      return res.status(400).json({ error: "New password is too long." });
    if (newPassword === currentPassword)
      return res.status(400).json({
        error: "New password must be different from the current one.",
      });

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { passwordHash: true },
    });
    if (!user) return res.status(404).json({ error: "Account not found." });

    // 400 on purpose, NOT 401: your api() helper logs the user out on any 401
    if (!(await verify(user.passwordHash, currentPassword)))
      return res.status(400).json({ error: "Your current password is wrong." });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash: await hash(newPassword) },
    });

    // sign out every other device; this one stays logged in
    const token = bearerToken(req);
    if (token) await revokeOtherTokens(req.user!.id, token);

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
