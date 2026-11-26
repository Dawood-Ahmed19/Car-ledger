import { prisma } from "../prisma.js";

const settingsSelect = {
  hideFullName: true,
  notifyMessages: true,
  notifyScam: true,
  notifyEvidence: true,
} as const;

const publicSelect = {
  id: true,
  username: true,
  fullName: true,
  role: true,
} as const;

export function findIdByEmail(email: string) {
  return prisma.user.findUnique({ where: { email }, select: { id: true } });
}

export function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function createUser(data: {
  email: string;
  username: string;
  fullName: string;
  phone: string;
  passwordHash: string;
  role: "buyer" | "seller";
}) {
  return prisma.user.create({ data, select: publicSelect });
}

export function findSettings(id: string) {
  return prisma.user.findUnique({ where: { id }, select: settingsSelect });
}

export function updateSettings(
  id: string,
  data: Partial<{
    hideFullName: boolean;
    notifyMessages: boolean;
    notifyScam: boolean;
    notifyEvidence: boolean;
  }>,
) {
  return prisma.user.update({ where: { id }, data, select: settingsSelect });
}

export function findPasswordHash(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { passwordHash: true },
  });
}

export function updatePassword(id: string, passwordHash: string) {
  return prisma.user.update({ where: { id }, data: { passwordHash } });
}

export function findAdminsExcept(userId: string) {
  return prisma.user.findMany({
    where: { role: "admin", id: { not: userId } },
    select: { id: true },
  });
}

export async function getPrefs(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifyMessages: true, notifyScam: true, notifyEvidence: true },
  });
  // unknown user: behave like the defaults (everything on)
  return (
    user ?? { notifyMessages: true, notifyScam: true, notifyEvidence: true }
  );
}

export function findNotifySwitches(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { notifyScam: true, notifyEvidence: true },
  });
}
