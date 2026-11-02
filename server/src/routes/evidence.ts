import { Router } from "express";
import multer from "multer";
import crypto from "node:crypto";
import { mkdirSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole, type SessionUser } from "../session.js";

export const evidenceRouter = Router();

const DIR = "private-uploads";
mkdirSync(DIR, { recursive: true });

const TYPES = ["registration", "inspection", "service", "owner_cnic"] as const;
type EvType = (typeof TYPES)[number];
const UUID = z.string().uuid();

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: DIR,
    filename: (_req, file, cb) =>
      cb(null, crypto.randomUUID() + EXT[file.mimetype]),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype in EXT),
}).single("file");

type Doc = {
  id: string;
  type: string;
  state: string;
  originalName: string;
  mimeType: string;
  reviewNote: string | null;
  createdAt: Date;
};
const toDoc = (d: Doc) => ({
  id: d.id,
  type: d.type,
  state: d.state,
  originalName: d.originalName,
  mimeType: d.mimeType,
  reviewNote: d.reviewNote,
  createdAt: d.createdAt,
});

async function access(listingId: string, user: SessionUser) {
  const l = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { sellerId: true },
  });
  if (!l) return "missing" as const;
  return l.sellerId === user.id || user.role === "admin"
    ? ("ok" as const)
    : ("forbidden" as const);
}

// Keeps listing.evidence and listing.status in step with its documents.
async function syncListing(listingId: string) {
  const [docs, listing] = await Promise.all([
    prisma.evidenceDocument.findMany({
      where: { listingId },
      select: { type: true, state: true },
    }),
    prisma.listing.findUnique({
      where: { id: listingId },
      select: { status: true },
    }),
  ]);
  if (!listing) return;

  const approved = docs.filter((d) => d.state === "approved").length;
  const status = docs.some((d) => d.state === "pending")
    ? ("under_review" as const)
    : approved === TYPES.length
      ? ("verified" as const)
      : ("not_checked" as const);

  const locked = listing.status === "recalled" || listing.status === "removed";
  await prisma.listing.update({
    where: { id: listingId },
    data: { evidence: docs.map((d) => d.type), ...(locked ? {} : { status }) },
  });
}

// Seller: upload or replace one document
evidenceRouter.post(
  "/listings/:id/evidence/:type",
  requireAuth,
  requireRole("seller", "admin"),
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        const big = (err as { code?: string }).code === "LIMIT_FILE_SIZE";
        return res.status(400).json({
          error: big
            ? "The file must be under 8 MB."
            : "Could not read the file.",
        });
      }
      next();
    });
  },
  async (req, res) => {
    const file = req.file;
    const drop = () =>
      file ? fs.rm(file.path, { force: true }) : Promise.resolve();
    try {
      const id = String(req.params.id);
      const type = String(req.params.type);
      if (!UUID.safeParse(id).success || !TYPES.includes(type as EvType)) {
        await drop();
        return res.status(400).json({ error: "Invalid request." });
      }
      if (!file) {
        return res
          .status(400)
          .json({ error: "Attach a PDF or an image (JPG, PNG, WebP)." });
      }
      const allowed = await access(id, req.user!);
      if (allowed !== "ok") {
        await drop();
        return res.status(allowed === "missing" ? 404 : 403).json({
          error:
            allowed === "missing"
              ? "Listing not found."
              : "This isn't your listing.",
        });
      }

      const key = { listingId: id, type: type as EvType };
      const old = await prisma.evidenceDocument.findUnique({
        where: { listingId_type: key },
      });
      if (old?.state === "approved") {
        await drop();
        return res
          .status(409)
          .json({ error: "This document is already approved." });
      }

      const fields = {
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
      };
      const doc = await prisma.evidenceDocument.upsert({
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
      if (old) await fs.rm(path.join(DIR, old.fileName), { force: true });
      await syncListing(id);
      res.status(201).json({ document: toDoc(doc) });
    } catch (e) {
      await drop();
      console.error(e);
      res
        .status(500)
        .json({ error: "Could not save the document. Try again." });
    }
  },
);

// Owner/admin: list a listing's documents
evidenceRouter.get("/listings/:id/evidence", requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    if (!UUID.safeParse(id).success)
      return res.status(400).json({ error: "Invalid listing ID." });
    const allowed = await access(id, req.user!);
    if (allowed !== "ok") {
      return res.status(allowed === "missing" ? 404 : 403).json({
        error:
          allowed === "missing"
            ? "Listing not found."
            : "This isn't your listing.",
      });
    }
    const docs = await prisma.evidenceDocument.findMany({
      where: { listingId: id },
    });
    res.json({ documents: docs.map(toDoc) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load documents. Try again." });
  }
});

// Seller: remove a document that isn't approved yet
evidenceRouter.delete(
  "/listings/:id/evidence/:type",
  requireAuth,
  async (req, res) => {
    try {
      const id = String(req.params.id);
      const type = String(req.params.type);
      if (!UUID.safeParse(id).success || !TYPES.includes(type as EvType)) {
        return res.status(400).json({ error: "Invalid request." });
      }
      const allowed = await access(id, req.user!);
      if (allowed !== "ok") {
        return res
          .status(allowed === "missing" ? 404 : 403)
          .json({ error: "Not allowed." });
      }
      const doc = await prisma.evidenceDocument.findUnique({
        where: { listingId_type: { listingId: id, type: type as EvType } },
      });
      if (!doc) return res.status(204).end();
      if (doc.state === "approved" && req.user!.role !== "admin") {
        return res
          .status(409)
          .json({ error: "An approved document can't be removed." });
      }
      await prisma.evidenceDocument.delete({ where: { id: doc.id } });
      await fs.rm(path.join(DIR, doc.fileName), { force: true });
      await syncListing(id);
      res.status(204).end();
    } catch (e) {
      console.error(e);
      res
        .status(500)
        .json({ error: "Could not remove the document. Try again." });
    }
  },
);

// Owner/admin: open the file itself
evidenceRouter.get("/evidence/:docId/file", requireAuth, async (req, res) => {
  try {
    const docId = String(req.params.docId);
    if (!UUID.safeParse(docId).success)
      return res.status(400).json({ error: "Invalid document ID." });
    const doc = await prisma.evidenceDocument.findUnique({
      where: { id: docId },
      include: { listing: { select: { sellerId: true } } },
    });
    if (!doc) return res.status(404).json({ error: "Document not found." });
    if (doc.listing.sellerId !== req.user!.id && req.user!.role !== "admin") {
      return res.status(403).json({ error: "You do not have access to this." });
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.type(doc.mimeType);
    res.sendFile(path.resolve(DIR, doc.fileName));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not open the document." });
  }
});

// Admin: approve or reject
const reviewSchema = z
  .object({
    state: z.enum(["approved", "rejected"]),
    note: z.string().trim().max(300).optional(),
  })
  .refine((v) => v.state === "approved" || !!v.note, {
    message: "Say why it was rejected.",
    path: ["note"],
  });

evidenceRouter.patch(
  "/evidence/:docId/review",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const docId = String(req.params.docId);
    if (!UUID.safeParse(docId).success)
      return res.status(400).json({ error: "Invalid document ID." });
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.issues[0].message });
    try {
      const doc = await prisma.evidenceDocument.update({
        where: { id: docId },
        data: {
          state: parsed.data.state,
          reviewNote:
            parsed.data.state === "rejected"
              ? (parsed.data.note ?? null)
              : null,
          reviewedAt: new Date(),
          reviewedById: req.user!.id,
        },
      });
      await syncListing(doc.listingId);
      res.json({ document: toDoc(doc) });
    } catch (e) {
      if ((e as { code?: string }).code === "P2025") {
        return res.status(404).json({ error: "Document not found." });
      }
      console.error(e);
      res.status(500).json({ error: "Could not save the review." });
    }
  },
);
