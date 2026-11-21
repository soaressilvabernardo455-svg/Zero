import express from "express";
import path from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { RoomManager } from "./server/room-manager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  transports: ["websocket", "polling"],
  maxHttpBufferSize: 12_000
});
const rooms = new RoomManager({ maxPlayers: 6 });
const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, "public");
const threeBuildDir = path.join(__dirname, "node_modules", "three", "build");
app.use("/vendor", express.static(threeBuildDir, { maxAge: "1d", immutable: true }));

app.disable("x-powered-by");
app.use(express.static(publicDir, {
  etag: true,
  // Do not let mobile browsers keep an old lobby after a deployment.
  maxAge: 0,
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    } else if (filePath.endsWith(".js") || filePath.endsWith(".css")) {
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
    }
  }
}));
app.get("/health", (_req, res) => {
  res.json({ ok: true, game: "ZERO", multiplayer: true, status: "online" });
});
app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

function sendRoomState(code) {
  const room = rooms.rooms.get(code);
  if (!room) return;
  io.to(code).emit("room:state", rooms.serialize(room));
}

function detachSocketFromCurrentRoom(socket) {
  const current = rooms.getRoomForSocket(socket.id);
  if (!current) return;
  const result = rooms.leave(socket.id);
  socket.leave(result.code);
  if (result.room) io.to(result.code).emit("room:state", result.room);
  io.to(result.code).emit("game:player-left", socket.id);
}

function addSocketToRoom(socket, result) {
  if (!result.ok) {
    socket.emit("room:error", result.error);
    return;
  }
  const code = result.room.code;
  socket.join(code);
  sendRoomState(code);
}

io.on("connection", (socket) => {
  let lastMoveAt = 0;

  socket.on("room:create", (data = {}) => {
    detachSocketFromCurrentRoom(socket);
    const result = rooms.create(socket.id, data.name);
    addSocketToRoom(socket, result);
  });

  socket.on("room:quick", (data = {}) => {
    detachSocketFromCurrentRoom(socket);
    const result = rooms.quickJoin(socket.id, data.name);
    addSocketToRoom(socket, result);
  });

  socket.on("room:join", (data = {}) => {
    detachSocketFromCurrentRoom(socket);
    const result = rooms.join(socket.id, data.code, data.name);
    addSocketToRoom(socket, result);
  });

  socket.on("room:ready", (data = {}) => {
    const result = rooms.setReady(socket.id, data.ready);
    if (!result.ok) socket.emit("room:error", result.error);
    else sendRoomState(result.room.code);
  });

  socket.on("room:start", () => {
    const result = rooms.start(socket.id);
    if (!result.ok) socket.emit("room:error", result.error);
    else io.to(result.room.code).emit("game:start", result.room);
  });

  socket.on("player:fire", (shot) => {
    const room = rooms.getRoomForSocket(socket.id);
    if (!room || !room.started || !shot || !shot.origin || !shot.direction) return;
    const numbers = [shot.origin.x, shot.origin.y, shot.origin.z, shot.direction.x, shot.direction.y, shot.direction.z];
    if (!numbers.every(Number.isFinite)) return;
    const directionLength = Math.hypot(shot.direction.x, shot.direction.y, shot.direction.z);
    if (directionLength < 0.7 || directionLength > 1.3) return;
    const now = Date.now();
    if (!socket.data.lastShotAt || now - socket.data.lastShotAt >= 130) {
      socket.data.lastShotAt = now;
      socket.to(room.code).emit("player:fire", {
        origin: {
          x: Math.max(-60, Math.min(60, shot.origin.x)),
          y: Math.max(0.2, Math.min(8, shot.origin.y)),
          z: Math.max(-60, Math.min(60, shot.origin.z))
        },
        direction: {
          x: shot.direction.x / directionLength,
          y: shot.direction.y / directionLength,
          z: shot.direction.z / directionLength
        }
      });
    }
  });

  socket.on("player:move", (state) => {
    const now = Date.now();
    if (now - lastMoveAt < 45) return;
    lastMoveAt = now;
    const update = rooms.updatePlayer(socket.id, state);
    if (update) socket.to(update.code).emit("player:move", update.player);
  });

  socket.on("room:leave", () => {
    const result = rooms.leave(socket.id);
    if (!result) return;
    socket.leave(result.code);
    if (result.room) io.to(result.code).emit("room:state", result.room);
    io.to(result.code).emit("game:player-left", socket.id);
  });

  socket.on("disconnect", () => {
    const result = rooms.leave(socket.id);
    if (!result) return;
    if (result.room) io.to(result.code).emit("room:state", result.room);
    io.to(result.code).emit("game:player-left", socket.id);
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("ZERO online na porta " + PORT);
});
