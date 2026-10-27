import "dotenv/config";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { authRouter } from "./routes/auth.js";
import { requireAuth } from "./session.js";
import { listingsRouter } from "./routes/listings.js";
import { conversationsRouter } from "./routes/conversations.js";
import { createServer } from "node:http";
import { initRealtime } from "./realtime.js";
import { pushRouter } from "./routes/push.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.use("/api/auth", authRouter);
app.get("/api/me", requireAuth, (req, res) => res.json({ user: req.user }));
app.use("/uploads", express.static("uploads"));
app.use("/api/listings", listingsRouter);
app.use("/api/conversations", requireAuth, conversationsRouter);
app.use("/api/push-token", requireAuth, pushRouter);

app.use((_req, res) => res.status(404).json({ error: "Not found." }));
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res
    .status(500)
    .json({ error: "Something went wrong on our side. Try again." });
});

const port = Number(process.env.PORT ?? 3000);
const httpServer = createServer(app);
initRealtime(httpServer);
httpServer.listen(port, "0.0.0.0", () =>
  console.log(`API running on http://localhost:${port}`),
);
