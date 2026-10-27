import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { userFromToken } from "./session.js";

let io: Server | null = null;

export function initRealtime(httpServer: HttpServer) {
  io = new Server(httpServer);

  // same session token your REST API uses
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string") return next(new Error("unauthorized"));
    const user = await userFromToken(token);
    if (!user) return next(new Error("unauthorized"));
    socket.data.userId = user.id;
    next();
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
  });
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export async function isOnline(userId: string) {
  if (!io) return false;
  return (await io.in(`user:${userId}`).fetchSockets()).length > 0;
}
