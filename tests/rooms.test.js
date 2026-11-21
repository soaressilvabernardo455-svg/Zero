import test from "node:test";
import assert from "node:assert/strict";
import { RoomManager, cleanPlayerName, cleanRoomCode } from "../server/room-manager.js";

function manager() {
  let next = 0;
  return new RoomManager({ codeFactory: () => "ROOM" + String(++next).padStart(2, "0") });
}

test("limpa nomes e códigos de sala", () => {
  assert.equal(cleanPlayerName("  <Operador>  "), "Operador");
  assert.equal(cleanPlayerName(""), "Operador");
  assert.equal(cleanRoomCode("ab-12 cd"), "AB12CD");
});

test("cria sala, permite entrada e transfere liderança", () => {
  const rooms = manager();
  const created = rooms.create("a", "Líder");
  assert.equal(created.ok, true);
  assert.equal(created.room.players.length, 1);
  const joined = rooms.join("b", created.room.code, "Convidado");
  assert.equal(joined.ok, true);
  assert.equal(joined.room.players.length, 2);
  const left = rooms.leave("a");
  assert.equal(left.room.hostId, "b");
});

test("não inicia com um jogador ou com alguém não pronto", () => {
  const rooms = manager();
  const created = rooms.create("a", "Um");
  assert.equal(rooms.start("a").ok, false);
  rooms.join("b", created.room.code, "Dois");
  rooms.setReady("a", true);
  assert.equal(rooms.start("a").ok, false);
  rooms.setReady("b", true);
  assert.equal(rooms.start("a").ok, true);
});

test("recusa entrada após início e ignora movimento fora da partida", () => {
  const rooms = manager();
  const created = rooms.create("a", "Um");
  rooms.join("b", created.room.code, "Dois");
  rooms.setReady("a", true);
  rooms.setReady("b", true);
  rooms.start("a");
  assert.equal(rooms.join("c", created.room.code, "Três").ok, false);
  assert.equal(rooms.updatePlayer("a", { x: 999, z: -999, yaw: 0, pitch: 0 }).player.x, 108);
});

test("partida rápida encontra sala aberta e respeita o limite", () => {
  const rooms = manager();
  const first = rooms.quickJoin("a", "Um");
  const second = rooms.quickJoin("b", "Dois");
  assert.equal(first.room.code, second.room.code);
  assert.equal(second.room.players.length, 2);
  rooms.quickJoin("c", "Três");
  rooms.quickJoin("d", "Quatro");
  rooms.quickJoin("e", "Cinco");
  rooms.quickJoin("f", "Seis");
  const seventh = rooms.quickJoin("g", "Sete");
  assert.notEqual(seventh.room.code, first.room.code);
});

test("ignora estado de movimento inválido e limita coordenadas", () => {
  const rooms = manager();
  const created = rooms.create("a", "Um");
  rooms.join("b", created.room.code, "Dois");
  rooms.setReady("a", true);
  rooms.setReady("b", true);
  rooms.start("a");
  assert.equal(rooms.updatePlayer("a", { x: "hack", z: 0, yaw: 0, pitch: 0 }), null);
  const update = rooms.updatePlayer("a", { x: -100, z: 100, yaw: 0, pitch: 9 });
  assert.equal(update.player.x, -100);
  assert.equal(update.player.z, 100);
  assert.equal(update.player.pitch, 1.2);
});
