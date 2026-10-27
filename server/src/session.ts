import { createHash, randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "./prisma.js";

const DAYS = 7;
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

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

export async function createToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DAYS * 86_400_000);
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  return { token, expiresAt: expiresAt.toISOString() };
}

export function bearerToken(req: Request) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
  return m ? m[1] : null;
}

export async function revokeToken(token: string) {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: "Log in to continue." });

  const session = await prisma.session.findFirst({
    where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() } },
    select: {
      user: {
        select: { id: true, username: true, fullName: true, role: true },
      },
    },
  });
  if (!session)
    return res
      .status(401)
      .json({ error: "Your session has ended. Log in again." });

  req.user = session.user;
  next();
}

// Use on routes only some roles may call: app.get("/x", requireAuth, requireRole("admin"), handler)
export const requireRole =
  (...roles: SessionUser["role"][]) =>
  (req: Request, res: Response, next: NextFunction) =>
    roles.includes(req.user!.role)
      ? next()
      : res.status(403).json({ error: "You do not have access to this." });
