import { Router } from "express";
import { Expo } from "expo-server-sdk";
import { prisma } from "../prisma.js";

export const pushRouter = Router();

// Register this device. If the token already exists (e.g. another account used this phone), it moves to the current user.
pushRouter.post("/", async (req, res, next) => {
  try {
    const token = String(req.body?.token ?? "");
    if (!Expo.isExpoPushToken(token))
      return res.status(400).json({ error: "Invalid push token." });
    await prisma.pushToken.upsert({
      where: { token },
      update: { userId: req.user!.id },
      create: { token, userId: req.user!.id },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Call before logout so the old account stops getting pushes on this phone.
pushRouter.post("/remove", async (req, res, next) => {
  try {
    const token = String(req.body?.token ?? "");
    await prisma.pushToken.deleteMany({
      where: { token, userId: req.user!.id },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
