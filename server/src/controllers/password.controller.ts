import { hash, verify } from "@node-rs/argon2";
import type { NextFunction, Request, Response } from "express";
import { bearerToken } from "../middleware/auth.js";
import { revokeOtherTokens } from "../models/session.model.js";
import * as userModel from "../models/user.model.js";

const MIN_LENGTH = 8; // keep this the same as your signup rule in schemas.ts
const MAX_LENGTH = 128;

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
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

    const user = await userModel.findPasswordHash(req.user!.id);
    if (!user) return res.status(404).json({ error: "Account not found." });

    // 400 on purpose, NOT 401: your api() helper logs the user out on any 401
    if (!(await verify(user.passwordHash, currentPassword)))
      return res.status(400).json({ error: "Your current password is wrong." });

    await userModel.updatePassword(req.user!.id, await hash(newPassword));

    // sign out every other device; this one stays logged in
    const token = bearerToken(req);
    if (token) await revokeOtherTokens(req.user!.id, token);

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
