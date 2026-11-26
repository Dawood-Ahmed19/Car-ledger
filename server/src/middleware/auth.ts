import type { NextFunction, Request, Response } from "express";
import { findActiveUser } from "../models/session.model.js";

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: "buyer" | "seller" | "admin";
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export function bearerToken(req: Request) {
  const match = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
  return match ? match[1] : null;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: "Log in to continue." });

  const user = await findActiveUser(token);
  if (!user)
    return res
      .status(401)
      .json({ error: "Your session has ended. Log in again." });

  req.user = user;
  next();
}

export const requireRole =
  (...roles: SessionUser["role"][]) =>
  (req: Request, res: Response, next: NextFunction) =>
    roles.includes(req.user!.role)
      ? next()
      : res.status(403).json({ error: "You do not have access to this." });
