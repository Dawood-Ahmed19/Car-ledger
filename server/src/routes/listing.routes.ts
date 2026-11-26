import crypto from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as listing from "../controllers/listing.controller.js";

export const listingsRouter = Router();

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads",
    filename: (_req, file, cb) =>
      cb(null, crypto.randomUUID() + EXT[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype in EXT),
}).array("photos", 8);

listingsRouter.get("/", requireAuth, listing.list);
listingsRouter.get("/mine", requireAuth, listing.mine);
listingsRouter.get("/saved", requireAuth, listing.saved);
listingsRouter.get("/:id", requireAuth, listing.show);
listingsRouter.post(
  "/",
  requireAuth,
  requireRole("seller", "admin"), // buyers are rejected before any file is written
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        const tooBig = (err as { code?: string }).code === "LIMIT_FILE_SIZE";
        return res.status(400).json({
          error: tooBig
            ? "Each photo must be under 5 MB."
            : "Could not read the photos.",
        });
      }
      next();
    });
  },
  listing.create,
);
listingsRouter.delete("/:id", requireAuth, listing.remove);
