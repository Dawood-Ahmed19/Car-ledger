import { prisma } from "../prisma.js";

export function listForUser(userId: string) {
  return prisma.savedListing.findMany({
    where: { userId },
    include: { listing: true },
    orderBy: { createdAt: "desc" },
  });
}

export function listSnapshots(userId: string) {
  return prisma.savedListing.findMany({
    where: { userId },
    select: {
      seenStatus: true,
      seenPrice: true,
      listing: { select: { status: true, price: true } },
    },
  });
}

export function save(data: {
  userId: string;
  listingId: string;
  seenStatus: "verified" | "under_review" | "not_checked" | "recalled" | "removed";
  seenPrice: number;
}) {
  return prisma.savedListing.upsert({
    where: { userId_listingId: { userId: data.userId, listingId: data.listingId } },
    create: data,
    update: {},
  });
}

export function remove(userId: string, listingId: string) {
  return prisma.savedListing.deleteMany({ where: { userId, listingId } });
}

export function markSeen(
  userId: string,
  listingId: string,
  seenStatus: "verified" | "under_review" | "not_checked" | "recalled" | "removed",
  seenPrice: number,
) {
  return prisma.savedListing.updateMany({
    where: { userId, listingId },
    data: { seenStatus, seenPrice },
  });
}
