import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma.js";
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

    const pending = await prisma.listing.findMany({
      where: { photoCheck: "pending" },
      orderBy: { createdAt: "asc" },
      take: BATCH,
      select: { id: true, title: true, sellerId: true, photos: true },
    });

    for (const l of pending) {
      const paths = l.photos
        .filter((p) => !p.startsWith("http"))
        .map(toDiskPath);

      // keep only files that still exist on disk
      const files: { path: string }[] = [];
      for (const p of paths) {
        try {
          await fs.access(p);
          files.push({ path: p });
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
        await prisma.listing.update({
          where: { id: l.id },
          data: { photoCheck: "passed" },
        });
        continue;
      }

      const first = rejected[0] + 1;
      if (ACTION === "delete") {
        await prisma.listing.delete({ where: { id: l.id } });
        await Promise.all(paths.map((p) => fs.rm(p, { force: true })));
      } else {
        await prisma.listing.update({
          where: { id: l.id },
          data: { status: "removed", photoCheck: "passed" },
        });
      }

      await notify(l.sellerId, {
        type: "listing",
        title: "Your listing was removed",
        body: `"${l.title}" was removed because photo ${first} doesn't look like a real car or bike photo. You can post it again with valid photos.`,
      });
      console.log(
        `Photo recheck: removed "${l.title}" (photo ${first} rejected)`,
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
