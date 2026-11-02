import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../session.js";
import { toListing } from "./listings.js";

export const savedRouter = Router();
const UUID = z.string().uuid();

function changesOf(
  s: { seenStatus: string; seenPrice: number },
  l: { status: string; price: number },
) {
  const out: ("status" | "price")[] = [];
  if (s.seenStatus !== l.status) out.push("status");
  if (s.seenPrice !== l.price) out.push("price");
  return out;
}

// My saved listings, with what changed since I last looked
savedRouter.get("/", requireAuth, async (req, res) => {
  try {
    const rows = await prisma.savedListing.findMany({
      where: { userId: req.user!.id },
      include: { listing: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      saved: rows.map((s) => ({
        listing: { ...toListing(s.listing), isSaved: true },
        changes: changesOf(s, s.listing),
      })),
    });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ error: "Could not load saved listings. Try again." });
  }
});

// How many saved listings changed (drives the Home banner)
savedRouter.get("/updates", requireAuth, async (req, res) => {
  try {
    const rows = await prisma.savedListing.findMany({
      where: { userId: req.user!.id },
      select: {
        seenStatus: true,
        seenPrice: true,
        listing: { select: { status: true, price: true } },
      },
    });
    const count = rows.filter((s) => changesOf(s, s.listing).length > 0).length;
    res.json({ count });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not check for updates." });
  }
});

// Save a listing (snapshots its current status and price)
savedRouter.put("/:listingId", requireAuth, async (req, res) => {
  try {
    const listingId = String(req.params.listingId);
    if (!UUID.safeParse(listingId).success) {
      return res.status(400).json({ error: "Invalid listing ID." });
    }
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { status: true, price: true },
    });
    if (!listing || listing.status === "removed") {
      return res.status(404).json({ error: "Listing not found." });
    }
    await prisma.savedListing.upsert({
      where: { userId_listingId: { userId: req.user!.id, listingId } },
      create: {
        userId: req.user!.id,
        listingId,
        seenStatus: listing.status,
        seenPrice: listing.price,
      },
      update: {},
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not save the listing. Try again." });
  }
});

savedRouter.delete("/:listingId", requireAuth, async (req, res) => {
  try {
    const listingId = String(req.params.listingId);
    if (!UUID.safeParse(listingId).success) {
      return res.status(400).json({ error: "Invalid listing ID." });
    }
    await prisma.savedListing.deleteMany({
      where: { userId: req.user!.id, listingId },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not remove the listing. Try again." });
  }
});

// "I've looked at the changes": refresh the snapshot
savedRouter.post("/:listingId/seen", requireAuth, async (req, res) => {
  try {
    const listingId = String(req.params.listingId);
    if (!UUID.safeParse(listingId).success) {
      return res.status(400).json({ error: "Invalid listing ID." });
    }
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { status: true, price: true },
    });
    if (listing) {
      await prisma.savedListing.updateMany({
        where: { userId: req.user!.id, listingId },
        data: { seenStatus: listing.status, seenPrice: listing.price },
      });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not update." });
  }
});
