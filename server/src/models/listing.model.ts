import { prisma } from "../prisma.js";

export function listFeed(userId: string) {
  return prisma.listing.findMany({
    where: { status: { not: "removed" } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      saved: { where: { userId }, select: { id: true } },
    },
  });
}

export function listBySeller(sellerId: string) {
  return prisma.listing.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export function listSavedOnListings(userId: string) {
  return prisma.savedListing.findMany({
    where: { userId, listing: { status: { not: "removed" } } },
    include: { listing: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export function findWithSaved(id: string, userId: string) {
  return prisma.listing.findUnique({
    where: { id },
    include: {
      saved: { where: { userId }, select: { id: true } },
    },
  });
}

export function createListing(data: {
  title: string;
  price: number;
  mileageKm: number;
  city: string;
  about: string;
  bodyType: string;
  fuelType: string;
  evidence: string[];
  photos: string[];
  sellerId: string;
  photoCheck: "passed" | "pending";
}) {
  return prisma.listing.create({ data });
}

export function findForDelete(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    select: { id: true, sellerId: true, photos: true },
  });
}

export function deleteListing(id: string) {
  return prisma.listing.delete({ where: { id } });
}

export function findById(id: string) {
  return prisma.listing.findUnique({ where: { id } });
}

export function findSellerId(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    select: { sellerId: true },
  });
}

export function findTitle(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    select: { title: true },
  });
}

export function findPriceStatus(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    select: { status: true, price: true },
  });
}

export function findPendingPhotoChecks(take: number) {
  return prisma.listing.findMany({
    where: { photoCheck: "pending" },
    orderBy: { createdAt: "asc" },
    take,
    select: { id: true, title: true, sellerId: true, photos: true },
  });
}

export function setPhotoCheckPassed(id: string) {
  return prisma.listing.update({
    where: { id },
    data: { photoCheck: "passed" },
  });
}

export function setRemovedAfterPhotoCheck(id: string) {
  return prisma.listing.update({
    where: { id },
    data: { status: "removed", photoCheck: "passed" },
  });
}

export function syncEvidence(
  id: string,
  evidence: string[],
  status?: "under_review" | "verified" | "not_checked",
) {
  return prisma.listing.update({
    where: { id },
    data: { evidence, ...(status ? { status } : {}) },
  });
}

export function findStatus(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    select: { status: true },
  });
}
