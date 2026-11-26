import fs from "node:fs/promises";
import path from "node:path";
import * as listingModel from "../models/listing.model.js";
import { findRejectedPhotos } from "./photoCheck.js";
import { notify } from "./notify.js";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

// "delete" = remove the listing for good (chats and saves on it go too)
// "remove" = keep the row but set status "removed" (safer if the AI wrongly rejects)
const ACTION: "delete" | "remove" = "delete";

const EVERY_MS = 5 * 60 * 1000; // how often to look for pending listings
const BATCH = 3; // listings per run, so the model isn't tied up for long

let running = false;

// Photos are stored as "/uploads/abc.jpg" (or similar). Turn that into a disk path.
const toDiskPath = (p: string) => path.resolve(p.replace(/^\/+/, ""));

async function ollamaIsUp() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

async function recheck() {
  if (running) return;
  running = true;
  try {
    if (!(await ollamaIsUp())) return;

    const pending = await listingModel.findPendingPhotoChecks(BATCH);

    for (const listing of pending) {
      const paths = listing.photos
        .filter((photo) => !photo.startsWith("http"))
        .map(toDiskPath);

      // keep only files that still exist on disk
      const files: { path: string }[] = [];
      for (const filePath of paths) {
        try {
          await fs.access(filePath);
          files.push({ path: filePath });
        } catch {}
      }
      if (files.length === 0) continue; // nothing to check, try again later

      let rejected: number[];
      try {
        rejected = await findRejectedPhotos(files);
      } catch {
        return; // the AI went down again, stop and wait for the next run
      }

      if (rejected.length === 0) {
        await listingModel.setPhotoCheckPassed(listing.id);
        continue;
      }

      const first = rejected[0] + 1;
      if (ACTION === "delete") {
        await listingModel.deleteListing(listing.id);
        await Promise.all(paths.map((filePath) => fs.rm(filePath, { force: true })));
      } else {
        await listingModel.setRemovedAfterPhotoCheck(listing.id);
      }

      await notify(listing.sellerId, {
        type: "listing",
        title: "Your listing was removed",
        body: `"${listing.title}" was removed because photo ${first} doesn't look like a real car or bike photo. You can post it again with valid photos.`,
      });
      console.log(
        `Photo recheck: removed "${listing.title}" (photo ${first} rejected)`,
      );
    }
  } catch (e) {
    console.error("photo recheck failed", e);
  } finally {
    running = false;
  }
}

export function startPhotoRecheck() {
  setInterval(() => void recheck(), EVERY_MS);
  setTimeout(() => void recheck(), 30_000); // one early run after the server starts
}
