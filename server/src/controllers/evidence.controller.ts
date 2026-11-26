import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { z } from "zod";
import { EVIDENCE_KEYS } from "../schemas.js";
import type { SessionUser } from "../middleware/auth.js";
import * as evidenceModel from "../models/evidence.model.js";
import * as listingModel from "../models/listing.model.js";
import { findAdminsExcept } from "../models/user.model.js";
import { notify } from "../services/notify.js";
import { toDocument } from "../views/evidence.view.js";

export const EVIDENCE_DIR = "private-uploads";

type EvidenceType = (typeof EVIDENCE_KEYS)[number];

const UUID = z.string().uuid();

const LABEL: Record<string, string> = {
  registration: "Registration papers",
  inspection: "Inspection report",
  service: "Service history",
  owner_cnic: "Owner CNIC",
};

const reviewSchema = z
  .object({
    state: z.enum(["approved", "rejected"]),
    note: z.string().trim().max(300).optional(),
  })
  .refine((value) => value.state === "approved" || !!value.note, {
    message: "Say why it was rejected.",
    path: ["note"],
  });

async function access(listingId: string, user: SessionUser) {
  const listing = await listingModel.findSellerId(listingId);
  if (!listing) return "missing" as const;
  return listing.sellerId === user.id || user.role === "admin"
    ? ("ok" as const)
    : ("forbidden" as const);
}

export async function upload(req: Request, res: Response) {
  const file = req.file;
  const drop = () => (file ? fs.rm(file.path, { force: true }) : Promise.resolve());
  try {
    const id = String(req.params.id);
    const type = String(req.params.type);
    if (!UUID.safeParse(id).success || !EVIDENCE_KEYS.includes(type as EvidenceType)) {
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
          allowed === "missing" ? "Listing not found." : "This isn't your listing.",
      });
    }

    const old = await evidenceModel.findByListingAndType(id, type as EvidenceType);
    if (old?.state === "approved") {
      await drop();
      return res.status(409).json({ error: "This document is already approved." });
    }

    const doc = await evidenceModel.upsert({
      listingId: id,
      type: type as EvidenceType,
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });
    if (old) await fs.rm(path.join(EVIDENCE_DIR, old.fileName), { force: true });
    await evidenceModel.syncListing(id);

    // let admins know there's something to review
    const [admins, listing] = await Promise.all([
      findAdminsExcept(req.user!.id),
      listingModel.findTitle(id),
    ]);
    for (const admin of admins) {
      void notify(admin.id, {
        type: "evidence",
        title: "Document waiting for review",
        body: `A new document was uploaded for "${listing?.title ?? "a listing"}".`,
        data: { listingId: id },
      });
    }

    res.status(201).json({ document: toDocument(doc) });
  } catch (e) {
    await drop();
    console.error(e);
    res.status(500).json({ error: "Could not save the document. Try again." });
  }
}

export async function list(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    if (!UUID.safeParse(id).success)
      return res.status(400).json({ error: "Invalid listing ID." });
    const allowed = await access(id, req.user!);
    if (allowed !== "ok") {
      return res.status(allowed === "missing" ? 404 : 403).json({
        error:
          allowed === "missing" ? "Listing not found." : "This isn't your listing.",
      });
    }
    const docs = await evidenceModel.findMany(id);
    res.json({ documents: docs.map(toDocument) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load documents. Try again." });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const type = String(req.params.type);
    if (!UUID.safeParse(id).success || !EVIDENCE_KEYS.includes(type as EvidenceType)) {
      return res.status(400).json({ error: "Invalid request." });
    }
    const allowed = await access(id, req.user!);
    if (allowed !== "ok") {
      return res
        .status(allowed === "missing" ? 404 : 403)
        .json({ error: "Not allowed." });
    }
    const doc = await evidenceModel.findByListingAndType(id, type as EvidenceType);
    if (!doc) return res.status(204).end();
    if (doc.state === "approved" && req.user!.role !== "admin") {
      return res
        .status(409)
        .json({ error: "An approved document can't be removed." });
    }
    await evidenceModel.remove(doc.id);
    await fs.rm(path.join(EVIDENCE_DIR, doc.fileName), { force: true });
    await evidenceModel.syncListing(id);
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not remove the document. Try again." });
  }
}

export async function file(req: Request, res: Response) {
  try {
    const docId = String(req.params.docId);
    if (!UUID.safeParse(docId).success)
      return res.status(400).json({ error: "Invalid document ID." });
    const doc = await evidenceModel.findById(docId);
    if (!doc) return res.status(404).json({ error: "Document not found." });
    if (doc.listing.sellerId !== req.user!.id && req.user!.role !== "admin") {
      return res.status(403).json({ error: "You do not have access to this." });
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.type(doc.mimeType);
    res.sendFile(path.resolve(EVIDENCE_DIR, doc.fileName));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not open the document." });
  }
}

export async function review(req: Request, res: Response) {
  const docId = String(req.params.docId);
  if (!UUID.safeParse(docId).success)
    return res.status(400).json({ error: "Invalid document ID." });
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    const doc = await evidenceModel.review(docId, {
      state: parsed.data.state,
      reviewNote: parsed.data.state === "rejected" ? (parsed.data.note ?? null) : null,
      reviewedById: req.user!.id,
    });
    const change = await evidenceModel.syncListing(doc.listingId);

    // tell the seller (skip if an admin is reviewing their own listing)
    const sellerId = doc.listing.sellerId;
    if (sellerId !== req.user!.id) {
      const label = LABEL[doc.type] ?? "A document";
      const title = doc.listing.title;
      const data = { listingId: doc.listingId };

      if (parsed.data.state === "approved") {
        await notify(sellerId, {
          type: "evidence",
          title: "Document approved",
          body: `${label} for "${title}" was approved.`,
          data,
        });
      } else {
        await notify(sellerId, {
          type: "evidence",
          title: "Document rejected",
          body: `${label} for "${title}" was rejected: ${parsed.data.note}. Upload a corrected file.`,
          data,
        });
      }

      if (change && change.before !== "verified" && change.after === "verified") {
        await notify(sellerId, {
          type: "listing",
          title: "Your listing is verified",
          body: `"${title}" now has the Verified badge. Buyers will see it.`,
          data,
        });
      }
    }

    res.json({ document: toDocument(doc) });
  } catch (e) {
    if ((e as { code?: string }).code === "P2025") {
      return res.status(404).json({ error: "Document not found." });
    }
    console.error(e);
    res.status(500).json({ error: "Could not save the review." });
  }
}
