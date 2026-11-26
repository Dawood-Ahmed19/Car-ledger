import type { NextFunction, Request, Response } from "express";
import * as userModel from "../models/user.model.js";

const KEYS = [
  "hideFullName",
  "notifyMessages",
  "notifyScam",
  "notifyEvidence",
] as const;

const DEFAULTS = {
  hideFullName: false,
  notifyMessages: true,
  notifyScam: true,
  notifyEvidence: true,
};

export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await userModel.findSettings(req.user!.id);
    res.json(settings ?? DEFAULTS);
  } catch (e) {
    next(e);
  }
}

// POST because your api() helper only supports GET/POST/DELETE
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data: Partial<Record<(typeof KEYS)[number], boolean>> = {};
    for (const key of KEYS) {
      const value = req.body?.[key];
      if (value === undefined) continue;
      if (typeof value !== "boolean")
        return res.status(400).json({ error: "Invalid setting." });
      data[key] = value;
    }
    if (Object.keys(data).length === 0)
      return res.status(400).json({ error: "Nothing to update." });

    const settings = await userModel.updateSettings(req.user!.id, data);
    res.json(settings);
  } catch (e) {
    next(e);
  }
}
