const DEFAULT_LIMIT = 6;

export function cleanPlayerName(value) {
  const name = String(value || "Operador").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 16);
  return name || "Operador";
}

export function cleanRoomCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export class RoomManager {
  constructor({ maxPlayers = DEFAULT_LIMIT, codeFactory } = {}) {
    this.maxPlayers = maxPlayers;
    this.codeFactory = codeFactory || (() => Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "X"));
    this.rooms = new Map();
    this.socketRooms = new Map();
  }

  makeCode() {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = cleanRoomCode(this.codeFactory());
      if (code.length === 6 && !this.rooms.has(code)) return code;
    }
    throw new Error("Não foi possível gerar um código de sala.");
  }

  create(socketId, name) {
    if (!socketId) return { ok: false, error: "Conexão inválida." };
    this.leave(socketId);
    const code = this.makeCode();
    const room = {
      code,
      hostId: socketId,
      started: false,
      players: new Map([[socketId, {
        id: socketId,
        name: cleanPlayerName(name),
        ready: false,
        x: 0,
        z: 13,
        yaw: 0,
        pitch: 0
      }]])
    };
    this.rooms.set(code, room);
    this.socketRooms.set(socketId, code);
    return { ok: true, room: this.serialize(room) };
  }

  quickJoin(socketId, name) {
    this.leave(socketId);
    const room = [...this.rooms.values()].find((item) => !item.started && item.players.size < this.maxPlayers);
    if (!room) return this.create(socketId, name);
    return this.join(socketId, room.code, name);
  }

  join(socketId, rawCode, name) {
    if (!socketId) return { ok: false, error: "Conexão inválida." };
    const code = cleanRoomCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: "Sala não encontrada. Confira o código." };
    if (room.started) return { ok: false, error: "Esta partida já começou." };
    if (room.players.size >= this.maxPlayers) return { ok: false, error: "Sala cheia." };
    this.leave(socketId);
    room.players.set(socketId, {
      id: socketId,
      name: cleanPlayerName(name),
      ready: false,
      x: room.players.size % 2 ? 4 : -4,
      z: 13,
      yaw: 0,
      pitch: 0
    });
    this.socketRooms.set(socketId, code);
    return { ok: true, room: this.serialize(room) };
  }

  setReady(socketId, ready) {
    const room = this.getRoomForSocket(socketId);
    if (!room) return { ok: false, error: "Você não está em uma sala." };
    const player = room.players.get(socketId);
    player.ready = Boolean(ready);
    return { ok: true, room: this.serialize(room) };
  }

  start(socketId) {
    const room = this.getRoomForSocket(socketId);
    if (!room) return { ok: false, error: "Você não está em uma sala." };
    if (room.hostId !== socketId) return { ok: false, error: "Somente o líder pode iniciar." };
    if (room.players.size < 2) return { ok: false, error: "É preciso ter pelo menos 2 jogadores." };
    if ([...room.players.values()].some((player) => !player.ready)) return { ok: false, error: "Todos precisam ficar prontos." };
    room.started = true;
    return { ok: true, room: this.serialize(room) };
  }

  updatePlayer(socketId, state) {
    const room = this.getRoomForSocket(socketId);
    if (!room || !room.started || !state || typeof state !== "object") return null;
    const player = room.players.get(socketId);
    const valid = (value, min, max) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : null;
    const x = valid(state.x, -50, 50);
    const z = valid(state.z, -50, 50);
    const yaw = valid(state.yaw, -100, 100);
    const pitch = valid(state.pitch, -1.2, 1.2);
    if (x === null || z === null || yaw === null || pitch === null) return null;
    player.x = x;
    player.z = z;
    player.yaw = yaw;
    player.pitch = pitch;
    return { code: room.code, player: { ...player } };
  }

  getRoomForSocket(socketId) {
    const code = this.socketRooms.get(socketId);
    return code ? this.rooms.get(code) || null : null;
  }

  serialize(room) {
    return {
      code: room.code,
      hostId: room.hostId,
      started: room.started,
      maxPlayers: this.maxPlayers,
      players: [...room.players.values()].map((player) => ({ ...player }))
    };
  }

  leave(socketId) {
    const room = this.getRoomForSocket(socketId);
    if (!room) {
      this.socketRooms.delete(socketId);
      return null;
    }
    const oldRoom = this.serialize(room);
    room.players.delete(socketId);
    this.socketRooms.delete(socketId);
    if (room.players.size === 0) {
      this.rooms.delete(room.code);
      return { code: room.code, oldRoom, room: null, removed: true };
    }
    if (room.hostId === socketId) room.hostId = room.players.keys().next().value;
    return { code: room.code, oldRoom, room: this.serialize(room), removed: false };
  }
}
