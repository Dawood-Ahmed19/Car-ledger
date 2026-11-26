import { Expo } from "expo-server-sdk";
import type { NextFunction, Request, Response } from "express";
import * as pushTokenModel from "../models/pushToken.model.js";

// Register this device. If the token already exists (e.g. another account used this phone), it moves to the current user.
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const token = String(req.body?.token ?? "");
    if (!Expo.isExpoPushToken(token))
      return res.status(400).json({ error: "Invalid push token." });
    await pushTokenModel.save(token, req.user!.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

// Call before logout so the old account stops getting pushes on this phone.
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const token = String(req.body?.token ?? "");
    await pushTokenModel.remove(token, req.user!.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
