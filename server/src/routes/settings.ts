import { Router } from "express";
import { prisma } from "../prisma.js";

export const settingsRouter = Router();

const KEYS = [
  "hideFullName",
  "notifyMessages",
  "notifyScam",
  "notifyEvidence",
] as const;

const select = {
  hideFullName: true,
  notifyMessages: true,
  notifyScam: true,
  notifyEvidence: true,
} as const;

settingsRouter.get("/", async (req, res, next) => {
  try {
    const u = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select,
    });
    res.json(
      u ?? {
        hideFullName: false,
        notifyMessages: true,
        notifyScam: true,
        notifyEvidence: true,
      },
    );
  } catch (e) {
    next(e);
  }
});

// POST because your api() helper only supports GET/POST/DELETE
settingsRouter.post("/", async (req, res, next) => {
  try {
    const data: Partial<Record<(typeof KEYS)[number], boolean>> = {};
    for (const k of KEYS) {
      const v = req.body?.[k];
      if (v === undefined) continue;
      if (typeof v !== "boolean")
        return res.status(400).json({ error: "Invalid setting." });
      data[k] = v;
    }
    if (Object.keys(data).length === 0)
      return res.status(400).json({ error: "Nothing to update." });

    const u = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select,
    });
    res.json(u);
  } catch (e) {
    next(e);
  }
});
