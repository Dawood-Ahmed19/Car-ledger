import { Router } from "express";
import rateLimit from "express-rate-limit";
import { hash, verify } from "@node-rs/argon2";
import { prisma } from "../prisma.js";
import { bearerToken, createToken, revokeToken } from "../session.js";
import { loginSchema, signupSchema } from "../schemas.js";

export const authRouter = Router();

authRouter.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts. Wait a few minutes and try again." },
  }),
);

const WRONG = "The email or password is wrong. Check both and try again.";
const EXISTS = "An account with this email already exists. Log in instead.";
const DUMMY_HASH = hash("not-a-real-password"); // so unknown emails take as long as wrong passwords

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message });
  const { fullName, email, phone, role, password } = parsed.data;

  if (
    await prisma.user.findUnique({ where: { email }, select: { id: true } })
  ) {
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
      const user = await prisma.user.create({
        data: { email, username, fullName, phone, passwordHash, role },
        select: { id: true, username: true, fullName: true, role: true },
      });
      const { token, expiresAt } = await createToken(user.id);
      return res.status(201).json({ token, expiresAt, user });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
      // unique clash: someone took the email just now, or the username number repeated
      if (
        await prisma.user.findUnique({ where: { email }, select: { id: true } })
      ) {
        return res.status(409).json({ error: EXISTS });
      }
    }
  }
  res.status(500).json({ error: "Could not create the account. Try again." });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(401).json({ error: WRONG });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await verify(user?.passwordHash ?? (await DUMMY_HASH), password);
  if (!user || !ok) return res.status(401).json({ error: WRONG });

  const { token, expiresAt } = await createToken(user.id);
  res.json({
    token,
    expiresAt,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  });
});

authRouter.post("/logout", async (req, res) => {
  const token = bearerToken(req);
  if (token) await revokeToken(token);
  res.status(204).end();
});
