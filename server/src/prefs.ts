import { prisma } from "./prisma.js";

export async function getPrefs(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifyMessages: true, notifyScam: true, notifyEvidence: true },
  });
  // unknown user: behave like the defaults (everything on)
  return u ?? { notifyMessages: true, notifyScam: true, notifyEvidence: true };
}
