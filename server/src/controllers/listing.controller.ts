import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { z } from "zod";
import { isUuid } from "../lib/uuid.js";
import * as listingModel from "../models/listing.model.js";
import { createListingSchema } from "../schemas.js";
import { findRejectedPhotos } from "../services/photoCheck.js";
import { toListing } from "../views/listing.view.js";

// "/uploads/abc.jpg" -> disk path "uploads/abc.jpg"
const toDiskPath = (photo: string) => path.resolve(photo.replace(/^\/+/, ""));

export async function list(req: Request, res: Response) {
  try {
    const rows = await listingModel.listFeed(req.user!.id);
    res.json({
      listings: rows.map((row) => ({
        ...toListing(row),
        isSaved: row.saved.length > 0,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load listings. Try again." });
  }
}

export async function mine(req: Request, res: Response) {
  try {
    const rows = await listingModel.listBySeller(req.user!.id);
    res.json({ listings: rows.map(toListing) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load your listings. Try again." });
  }
}

// The signed-in user's saved listings, with a "changed" flag.
export async function saved(req: Request, res: Response) {
  try {
    const rows = await listingModel.listSavedOnListings(req.user!.id);
    res.json({
      listings: rows.map((row) => ({
        ...toListing(row.listing),
        isSaved: true,
        changed:
          row.listing.status !== row.seenStatus ||
          row.listing.price !== row.seenPrice,
      })),
    });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ error: "Could not load saved listings. Try again." });
  }
}

export async function show(req: Request, res: Response) {
  const id = String(req.params.id);
  if (!isUuid(id))
    return res.status(404).json({ error: "Listing not found." });
  try {
    const row = await listingModel.findWithSaved(id, req.user!.id);
    if (!row || row.status === "removed")
      return res.status(404).json({ error: "Listing not found." });
    res.json({ listing: { ...toListing(row), isSaved: row.saved.length > 0 } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load the listing. Try again." });
  }
}

export async function create(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const cleanup = () =>
    Promise.all(files.map((file) => fs.rm(file.path, { force: true })));
  try {
    const parsed = createListingSchema.safeParse(req.body);
    if (!parsed.success) {
      await cleanup();
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    if (files.length === 0) {
      return res.status(400).json({ error: "Add at least one photo." });
    }

    // AI check: every photo must be a real photo of a car or bike.
    // If the AI can't be reached, the listing is still accepted but marked
    // "pending". The background job (photoRecheck) checks it later and
    // removes the listing if a photo isn't a real vehicle photo.
    let photoCheck: "passed" | "pending" = "passed";
    try {
      const rejected = await findRejectedPhotos(files);
      if (rejected.length > 0) {
        await cleanup();
        return res.status(422).json({
          error:
            "Some photos don't look like a car or bike. Replace them and try again.",
          rejected, // indexes of the bad photos, in upload order
        });
      }
    } catch (e) {
      console.error(
        "Photo check unavailable, saving listing as pending:",
        (e as Error).message,
      );
      photoCheck = "pending";
    }

    const {
      year,
      makeModel,
      price,
      mileage,
      city,
      about,
      evidence,
      bodyType,
      fuelType,
    } = parsed.data;

    const row = await listingModel.createListing({
      title: `${year} ${makeModel}`,
      price,
      mileageKm: mileage,
      city,
      about,
      bodyType,
      fuelType,
      evidence,
      photos: files.map((file) => `/uploads/${file.filename}`),
      sellerId: req.user!.id,
      photoCheck,
    });
    res.status(201).json({ listing: toListing(row) });
  } catch (e) {
    await cleanup();
    console.error(e);
    res.status(500).json({ error: "Could not save the listing. Try again." });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const id = req.params.id;

    if (typeof id !== "string" || !z.string().uuid().safeParse(id).success) {
      return res.status(400).json({ error: "Invalid listing ID" });
    }

    const listing = await listingModel.findForDelete(id);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Only the listing owner can delete it
    if (listing.sellerId !== req.user.id) {
      return res.status(403).json({
        error: "You are not allowed to delete this listing",
      });
    }

    await listingModel.deleteListing(id);

    // remove the photo files too, so they don't pile up on disk
    await Promise.all(
      listing.photos
        .filter((photo) => !photo.startsWith("http"))
        .map((photo) => fs.rm(toDiskPath(photo), { force: true })),
    );

    return res.status(204).send();
  } catch (error) {
    console.error("Delete listing error:", error);
    return res.status(500).json({ error: "Failed to delete listing" });
  }
}
