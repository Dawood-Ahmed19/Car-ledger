import type { Request, Response } from "express";

export function me(req: Request, res: Response) {
  res.json({ user: req.user });
}
