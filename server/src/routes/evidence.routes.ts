import crypto from "node:crypto";
import { mkdirSync } from "node:fs";
import { Router } from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as evidence from "../controllers/evidence.controller.js";

mkdirSync(evidence.EVIDENCE_DIR, { recursive: true });

export const evidenceRouter = Router();

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: evidence.EVIDENCE_DIR,
    filename: (_req, file, cb) =>
      cb(null, crypto.randomUUID() + EXT[file.mimetype]),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype in EXT),
}).single("file");

evidenceRouter.post(
  "/listings/:id/evidence/:type",
  requireAuth,
  requireRole("seller", "admin"),
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        const big = (err as { code?: string }).code === "LIMIT_FILE_SIZE";
        return res.status(400).json({
          error: big ? "The file must be under 8 MB." : "Could not read the file.",
        });
      }
      next();
    });
  },
  evidence.upload,
);
evidenceRouter.get("/listings/:id/evidence", requireAuth, evidence.list);
evidenceRouter.delete(
  "/listings/:id/evidence/:type",
  requireAuth,
  evidence.remove,
);
evidenceRouter.get("/evidence/:docId/file", requireAuth, evidence.file);
evidenceRouter.patch(
  "/evidence/:docId/review",
  requireAuth,
  requireRole("admin"),
  evidence.review,
);
