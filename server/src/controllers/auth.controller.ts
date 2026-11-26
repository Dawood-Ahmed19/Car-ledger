import { hash, verify } from "@node-rs/argon2";
import type { Request, Response } from "express";
import * as userModel from "../models/user.model.js";
import { createToken, revokeToken } from "../models/session.model.js";
import { bearerToken } from "../middleware/auth.js";
import { loginSchema, signupSchema } from "../schemas.js";
import { accountUser } from "../views/user.view.js";

const WRONG = "The email or password is wrong. Check both and try again.";
const EXISTS = "An account with this email already exists. Log in instead.";
const DUMMY_HASH = hash("not-a-real-password");

export async function signup(req: Request, res: Response) {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message });
  const { fullName, email, phone, role, password } = parsed.data;

  if (await userModel.findIdByEmail(email)) {
    return res.status(409).json({ error: EXISTS });
  }

  const passwordHash = await hash(password);
  const base =
    email
      .split("@")[0]
      .replace(/[^a-z0-9_]/gi, "")
      .toLowerCase() || "user";

  for (let attempt = 0; attempt < 3; attempt++) {
    const username = `${base}${Math.floor(100000 + Math.random() * 900000)}`;
    try {
      const user = await userModel.createUser({
        email,
        username,
        fullName,
        phone,
        passwordHash,
        role,
      });
      const { token, expiresAt } = await createToken(user.id);
      return res.status(201).json({ token, expiresAt, user });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
      // unique clash: someone took the email just now, or the username number repeated
      if (await userModel.findIdByEmail(email)) {
        return res.status(409).json({ error: EXISTS });
      }
    }
  }
  res.status(500).json({ error: "Could not create the account. Try again." });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(401).json({ error: WRONG });
  const { email, password } = parsed.data;

  const user = await userModel.findByEmail(email);
  const ok = await verify(user?.passwordHash ?? (await DUMMY_HASH), password);
  if (!user || !ok) return res.status(401).json({ error: WRONG });

  const { token, expiresAt } = await createToken(user.id);
  res.json({ token, expiresAt, user: accountUser(user) });
}

export async function logout(req: Request, res: Response) {
  const token = bearerToken(req);
  if (token) await revokeToken(token);
  res.status(204).end();
}
