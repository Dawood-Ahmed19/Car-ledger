import { prisma } from "../prisma.js";
import { EVIDENCE_KEYS } from "../schemas.js";
import { findStatus, syncEvidence } from "./listing.model.js";

type EvidenceType = (typeof EVIDENCE_KEYS)[number];

export function findMany(listingId: string) {
  return prisma.evidenceDocument.findMany({ where: { listingId } });
}

export function findByListingAndType(listingId: string, type: EvidenceType) {
  return prisma.evidenceDocument.findUnique({
    where: { listingId_type: { listingId, type } },
  });
}

export function findById(id: string) {
  return prisma.evidenceDocument.findUnique({
    where: { id },
    include: { listing: { select: { sellerId: true } } },
  });
}

export function upsert(input: {
  listingId: string;
  type: EvidenceType;
  fileName: string;
  originalName: string;
  mimeType: string;
}) {
  const key = { listingId: input.listingId, type: input.type };
  const fields = {
    fileName: input.fileName,
    originalName: input.originalName,
    mimeType: input.mimeType,
  };
  return prisma.evidenceDocument.upsert({
    where: { listingId_type: key },
    create: { ...key, ...fields },
    update: {
      ...fields,
      state: "pending",
      reviewNote: null,
      reviewedAt: null,
      reviewedById: null,
    },
  });
}

export function remove(id: string) {
  return prisma.evidenceDocument.delete({ where: { id } });
}

export function review(
  id: string,
  data: {
    state: "approved" | "rejected";
    reviewNote: string | null;
    reviewedById: string;
  },
) {
  return prisma.evidenceDocument.update({
    where: { id },
    data: {
      state: data.state,
      reviewNote: data.reviewNote,
      reviewedAt: new Date(),
      reviewedById: data.reviewedById,
    },
    include: { listing: { select: { title: true, sellerId: true } } },
  });
}

// Keeps listing.evidence and listing.status in step with its documents.
// Returns the status before and after, so callers can notify on changes.
export async function syncListing(listingId: string) {
  const [docs, listing] = await Promise.all([
    prisma.evidenceDocument.findMany({
      where: { listingId },
      select: { type: true, state: true },
    }),
    findStatus(listingId),
  ]);
  if (!listing) return null;

  const approved = docs.filter((doc) => doc.state === "approved").length;
  const status = docs.some((doc) => doc.state === "pending")
    ? ("under_review" as const)
    : approved === EVIDENCE_KEYS.length
      ? ("verified" as const)
      : ("not_checked" as const);

  const locked = listing.status === "recalled" || listing.status === "removed";
  await syncEvidence(listingId, docs.map((doc) => doc.type), locked ? undefined : status);
  return { before: listing.status, after: locked ? listing.status : status };
}
