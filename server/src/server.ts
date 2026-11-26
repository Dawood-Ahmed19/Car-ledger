import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { me } from "./controllers/me.controller.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.routes.js";
import { conversationsRouter } from "./routes/conversation.routes.js";
import { evidenceRouter } from "./routes/evidence.routes.js";
import { listingsRouter } from "./routes/listing.routes.js";
import { notificationsRouter } from "./routes/notification.routes.js";
import { passwordRouter } from "./routes/password.routes.js";
import { pushRouter } from "./routes/push.routes.js";
import { savedRouter } from "./routes/saved.routes.js";
import { settingsRouter } from "./routes/settings.routes.js";
import { startPhotoRecheck } from "./services/photoRecheck.js";
import { initRealtime } from "./services/realtime.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.use("/api/auth", authRouter);
app.get("/api/me", requireAuth, me);
app.use("/uploads", express.static("uploads"));
app.use("/api/listings", listingsRouter);
app.use("/api/conversations", requireAuth, conversationsRouter);
app.use("/api/push-token", requireAuth, pushRouter);
app.use("/api", evidenceRouter);
app.use("/api/saved", savedRouter);
app.use("/api/me/password", requireAuth, passwordRouter);
app.use("/api/notifications", requireAuth, notificationsRouter);
app.use("/api/me/settings", requireAuth, settingsRouter);

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT ?? 3000);
const httpServer = createServer(app);
initRealtime(httpServer);
httpServer.listen(port, "0.0.0.0", () =>
  console.log(`API running on http://localhost:${port}`),
);

startPhotoRecheck();
