import { Router } from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { prisma } from "../prisma.js";
import { requireAuth } from "../session.js";
import { createListingSchema } from "../schemas.js";

export const listingsRouter = Router();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function priceLabel(n: number) {
  if (n >= 1_000_000)
    return `PKR ${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  return `PKR ${n.toLocaleString("en-PK")}`;
}

function toListing(l: {
  id: string;
  title: string;
  price: number;
  mileageKm: number;
  city: string;
  about: string;
  status: string;
  evidence: string[];
  photos: string[];
}) {
  return {
    id: l.id,
    title: l.title,
    priceLabel: priceLabel(l.price),
    mileageLabel: `${l.mileageKm.toLocaleString("en-PK")} km`,
    city: l.city,
    about: l.about,
    status: l.status,
    evidence: l.evidence,
    photos: l.photos,
    imageUrl: l.photos[0],
    sellerTier: null,
  };
}

// All listings
listingsRouter.get("/", requireAuth, async (_req, res) => {
  try {
    const rows = await prisma.listing.findMany({
      where: { status: { not: "removed" } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ listings: rows.map(toListing) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load listings. Try again." });
  }
});

listingsRouter.get("/mine", requireAuth, async (req, res) => {
  try {
    const rows = await prisma.listing.findMany({
      where: { sellerId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ listings: rows.map(toListing) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load your listings. Try again." });
  }
});

// One listing
listingsRouter.get("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  if (!UUID.test(id))
    return res.status(404).json({ error: "Listing not found." });
  try {
    const row = await prisma.listing.findUnique({ where: { id } });
    if (!row || row.status === "removed")
      return res.status(404).json({ error: "Listing not found." });
    res.json({ listing: toListing(row) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load the listing. Try again." });
  }
});

// Create a listing
listingsRouter.post(
  "/",
  requireAuth,
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
  async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const cleanup = () =>
      Promise.all(files.map((f) => fs.rm(f.path, { force: true })));
    try {
      if (req.user!.role === "buyer") {
        await cleanup();
        return res
          .status(403)
          .json({ error: "Only seller accounts can post listings." });
      }
      const parsed = createListingSchema.safeParse(req.body);
      if (!parsed.success) {
        await cleanup();
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      if (files.length === 0)
        return res.status(400).json({ error: "Add at least one photo." });

      const { year, makeModel, price, mileage, city, about, evidence } =
        parsed.data;
      const row = await prisma.listing.create({
        data: {
          title: `${year} ${makeModel}`,
          price,
          mileageKm: mileage,
          city,
          about,
          evidence,
          photos: files.map((f) => `/uploads/${f.filename}`),
          sellerId: req.user!.id,
        },
      });
      res.status(201).json({ listing: toListing(row) });
    } catch (e) {
      await cleanup();
      console.error(e);
      res.status(500).json({ error: "Could not save the listing. Try again." });
    }
  },
);
