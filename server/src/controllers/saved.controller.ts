import type { Request, Response } from "express";
import { z } from "zod";
import * as listingModel from "../models/listing.model.js";
import * as savedModel from "../models/saved.model.js";
import { changesOf, toSavedEntry } from "../views/saved.view.js";

const UUID = z.string().uuid();

export async function list(req: Request, res: Response) {
  try {
    const rows = await savedModel.listForUser(req.user!.id);
    res.json({ saved: rows.map(toSavedEntry) });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ error: "Could not load saved listings. Try again." });
  }
}

// How many saved listings changed (drives the Home banner)
export async function updates(req: Request, res: Response) {
  try {
    const rows = await savedModel.listSnapshots(req.user!.id);
    const count = rows.filter(
      (row) => changesOf(row, row.listing).length > 0,
    ).length;
    res.json({ count });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not check for updates." });
  }
}

// Save a listing (snapshots its current status and price)
export async function save(req: Request, res: Response) {
  try {
    const listingId = String(req.params.listingId);
    if (!UUID.safeParse(listingId).success) {
      return res.status(400).json({ error: "Invalid listing ID." });
    }
    const listing = await listingModel.findPriceStatus(listingId);
    if (!listing || listing.status === "removed") {
      return res.status(404).json({ error: "Listing not found." });
    }
    await savedModel.save({
      userId: req.user!.id,
      listingId,
      seenStatus: listing.status,
      seenPrice: listing.price,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not save the listing. Try again." });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const listingId = String(req.params.listingId);
    if (!UUID.safeParse(listingId).success) {
      return res.status(400).json({ error: "Invalid listing ID." });
    }
    await savedModel.remove(req.user!.id, listingId);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not remove the listing. Try again." });
  }
}

// "I've looked at the changes": refresh the snapshot
export async function seen(req: Request, res: Response) {
  try {
    const listingId = String(req.params.listingId);
    if (!UUID.safeParse(listingId).success) {
      return res.status(400).json({ error: "Invalid listing ID." });
    }
    const listing = await listingModel.findPriceStatus(listingId);
    if (listing) {
      await savedModel.markSeen(
        req.user!.id,
        listingId,
        listing.status,
        listing.price,
      );
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not update." });
  }
}
