import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../prisma.js";

const DAYS = 7;
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const userSelect = {
  id: true,
  username: true,
  fullName: true,
  role: true,
} as const;

export async function createToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DAYS * 86_400_000);
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function revokeToken(token: string) {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function revokeOtherTokens(userId: string, currentToken: string) {
  await prisma.session.deleteMany({
    where: { userId, tokenHash: { not: hashToken(currentToken) } },
  });
}

export async function findActiveUser(token: string) {
  const session = await prisma.session.findFirst({
    where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() } },
    select: { user: { select: userSelect } },
  });
  return session?.user ?? null;
}
