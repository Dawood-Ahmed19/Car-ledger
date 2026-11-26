import { prisma } from "../prisma.js";

export function save(token: string, userId: string) {
  return prisma.pushToken.upsert({
    where: { token },
    update: { userId },
    create: { token, userId },
  });
}

export function remove(token: string, userId: string) {
  return prisma.pushToken.deleteMany({ where: { token, userId } });
}

export function listForUser(userId: string) {
  return prisma.pushToken.findMany({ where: { userId } });
}

export function deleteTokens(tokens: string[]) {
  return prisma.pushToken.deleteMany({ where: { token: { in: tokens } } });
}
