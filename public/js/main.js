import { Game } from "./game.js";
import { InputController } from "./input.js";

const canvas = document.getElementById("game-canvas");
const lobby = document.getElementById("lobby");
const hud = document.getElementById("hud");
const pause = document.getElementById("pause-message");
const toast = document.getElementById("toast");
const lobbyMessage = document.getElementById("lobby-message");
const sensitivity = document.getElementById("sensitivity");
const sensitivityValue = document.getElementById("sensitivity-value");
const connectionState = document.getElementById("connection-state");
const roomPanel = document.getElementById("room-panel");
const readyButton = document.getElementById("ready-button");
const startMatchButton = document.getElementById("start-match-button");
const networkToast = document.getElementById("network-toast");
const soloButton = document.getElementById("solo-button");

let game = null;
let input = null;
function ensureGame() {
  if (game && input) return true;
  let candidate = null;
  try {
    candidate = new Game(canvas, updateHud);
    const controls = new InputController(canvas, Number(sensitivity.value));
    candidate.setQuality(document.getElementById("quality").value);
    game = candidate;
    input = controls;
    return true;
  } catch (error) {
    if (candidate) {
      try { candidate.dispose(); } catch {}
    }
    game = null;
    input = null;
    console.error("ZERO game initialization failed:", error);
    showLobbyMessage("Não iniciou: " + (error && error.message ? error.message.slice(0, 140) : "erro desconhecido") + ". Confira se o navegador permite WebGL e tente novamente.", "error");
    return false;
  }
}
const socket = typeof window.io === "function" ? window.io({ transports: ["websocket", "polling"] }) : null;
let active = false;
let paused = false;
let lastTime = 0;
let lastNetworkSend = 0;
let lastShotSequence = 0;
let currentMode = "solo";
let currentRoom = null;

function updateHud(data) {
  if (data.health !== undefined) document.getElementById("health").textContent = data.health;
  if (data.score !== undefined) document.getElementById("score").textContent = data.score;
  if (data.ammo !== undefined) document.getElementById("ammo").textContent = data.ammo;
  if (data.worldTime !== undefined) document.getElementById("world-time").textContent = data.worldTime;
  if (data.hit) {
    const marker = document.getElementById("hit-feedback");
    marker.classList.add("hit");
    window.setTimeout(() => marker.classList.remove("hit"), 140);
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1500);
}

function showLobbyMessage(message, type = "") {
  lobbyMessage.textContent = message;
  lobbyMessage.className = "feedback" + (type ? " " + type : "");
}

function setConnection(connected, label) {
  connectionState.classList.toggle("online", connected);
  connectionState.classList.toggle("offline", !connected);
  connectionState.querySelector("span").textContent = label;
}

function getPlayerName() {
  const field = document.getElementById("player-name");
  const cleaned = field.value.replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 16) || "Operador";
  field.value = cleaned;
  return cleaned;
}

function renderRoom(room) {
  currentRoom = room;
  roomPanel.classList.remove("hidden");
  document.getElementById("room-code-display").textContent = room.code;
  document.getElementById("player-count").textContent = room.players.length + " / " + room.maxPlayers;
  const list = document.getElementById("players-list");
  list.replaceChildren();
  room.players.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "player-row";
    const symbol = document.createElement("span");
    symbol.className = "player-symbol";
    symbol.textContent = index === 0 ? "Z" : "•";
    const name = document.createElement("span");
    name.className = "player-name";
    name.textContent = player.name + (player.id === room.hostId ? "  · LÍDER" : "");
    const status = document.createElement("span");
    status.className = "player-status" + (player.ready ? " ready" : "");
    status.textContent = player.ready ? "PRONTO" : "AGUARDANDO";
    row.append(symbol, name, status);
    list.append(row);
  });
  const self = room.players.find((player) => socket && player.id === socket.id);
  const isHost = Boolean(socket && room.hostId === socket.id);
  readyButton.textContent = self && self.ready ? "CANCELAR PRONTO" : "FICAR PRONTO";
  readyButton.disabled = room.started;
  startMatchButton.classList.toggle("hidden", !isHost || room.started);
  startMatchButton.disabled = room.players.length < 2 || room.players.some((player) => !player.ready);
  showLobbyMessage(room.started ? "Partida iniciada. Conectando ao campo…" : "Compartilhe o código para chamar sua equipe.", "success");
  if (active && currentMode === "multiplayer") {
    if (game) game.setRemotePlayers(room.players.filter((player) => !socket || player.id !== socket.id));
  }
}

function startGame(mode) {
  if (!ensureGame()) return false;
  currentMode = mode;
  active = true;
  paused = false;
  lastTime = performance.now();
  lastNetworkSend = 0;
  game.reset();
  lastShotSequence = game.lastShotSequence || 0;
  if (mode === "multiplayer" && currentRoom) {
    if (game) game.setRemotePlayers(currentRoom.players.filter((player) => !socket || player.id !== socket.id));
    document.getElementById("match-indicator").textContent = "SALA " + currentRoom.code;
    networkToast.classList.add("hidden");
  } else {
    if (game) game.setRemotePlayers([]);
    document.getElementById("match-indicator").textContent = "TREINO SOLO";
  }
  lobby.classList.add("hidden");
  pause.classList.add("hidden");
  hud.classList.remove("hidden");
  requestAnimationFrame(loop);
  if (matchMedia("(pointer:fine)").matches) canvas.requestPointerLock?.();
  return true;
}

function loop(time) {
  if (!active || paused) return;
  const dt = Math.min((time - lastTime) / 1000 || 0, 0.04);
  lastTime = time;
  game.update(dt, input.consume());
  if (currentMode === "multiplayer" && currentRoom && socket && socket.connected && game.lastShotSequence !== lastShotSequence) {
    if (game.lastShot) socket.emit("player:fire", game.lastShot);
    lastShotSequence = game.lastShotSequence;
  }
  if (currentMode === "multiplayer" && currentRoom && socket && socket.connected && time - lastNetworkSend > 75) {
    socket.emit("player:move", game.getNetworkState());
    lastNetworkSend = time;
  }
  requestAnimationFrame(loop);
}

function returnToLobby() {
  active = false;
  paused = false;
  if (socket && currentRoom) socket.emit("room:leave");
  currentRoom = null;
  if (game) game.setRemotePlayers([]);
  soloButton.disabled = false;
  const soloLabel = soloButton.querySelector("b");
  if (soloLabel) soloLabel.textContent = "JOGAR SOZINHO";
  roomPanel.classList.add("hidden");
  hud.classList.add("hidden");
  pause.classList.add("hidden");
  lobby.classList.remove("hidden");
  networkToast.classList.add("hidden");
  if (document.pointerLockElement) document.exitPointerLock();
  showLobbyMessage("Escolha um modo para entrar na arena.");
}

function joinOrCreate(action) {
  if (!socket || !socket.connected) {
    showLobbyMessage("O servidor multiplayer não está conectado. Você ainda pode jogar sozinho.", "error");
    return;
  }
  const name = getPlayerName();
  if (action === "create") socket.emit("room:create", { name });
  if (action === "quick") socket.emit("room:quick", { name });
  if (action === "join") socket.emit("room:join", { name, code: document.getElementById("room-code").value });
  showLobbyMessage("Procurando uma sala…");
}

function pauseGame() {
  if (!active || paused) return;
  paused = true;
  pause.classList.remove("hidden");
  if (document.pointerLockElement) document.exitPointerLock();
}

function resumeGame() {
  if (!active || !paused) return;
  paused = false;
  pause.classList.add("hidden");
  lastTime = performance.now();
  requestAnimationFrame(loop);
  if (matchMedia("(pointer:fine)").matches) canvas.requestPointerLock?.();
}

soloButton.addEventListener("click", () => {
  if (socket && currentRoom) socket.emit("room:leave");
  currentRoom = null;
  soloButton.disabled = true;
  const label = soloButton.querySelector("b");
  if (label) label.textContent = "INICIANDO...";
  if (!startGame("solo")) {
    soloButton.disabled = false;
    if (label) label.textContent = "JOGAR SOZINHO";
  }
});
document.getElementById("quick-match-button").addEventListener("click", () => joinOrCreate("quick"));
document.getElementById("create-room-button").addEventListener("click", () => joinOrCreate("create"));
document.getElementById("join-room-button").addEventListener("click", () => joinOrCreate("join"));
document.getElementById("room-code").addEventListener("input", (event) => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
});
readyButton.addEventListener("click", () => {
  if (!socket || !currentRoom) return;
  const self = currentRoom.players.find((player) => player.id === socket.id);
  socket.emit("room:ready", { ready: !(self && self.ready) });
});
startMatchButton.addEventListener("click", () => {
  if (socket && currentRoom) socket.emit("room:start");
});
document.getElementById("leave-room-button").addEventListener("click", () => {
  if (socket) socket.emit("room:leave");
  currentRoom = null;
  roomPanel.classList.add("hidden");
  showLobbyMessage("Você saiu da sala.");
});
document.getElementById("copy-code-button").addEventListener("click", async () => {
  if (!currentRoom) return;
  try {
    await navigator.clipboard.writeText(currentRoom.code);
    showLobbyMessage("Código " + currentRoom.code + " copiado.", "success");
  } catch {
    showLobbyMessage("Código da sala: " + currentRoom.code, "success");
  }
});

document.getElementById("exit-button").addEventListener("click", returnToLobby);
document.getElementById("pause-exit-button").addEventListener("click", returnToLobby);
document.getElementById("resume-button").addEventListener("click", resumeGame);
sensitivity.addEventListener("input", () => {
  if (input) input.setSensitivity(sensitivity.value);
  sensitivityValue.textContent = Number(sensitivity.value).toFixed(1) + "x";
});
document.getElementById("quality").addEventListener("change", (event) => { if (game) game.setQuality(event.target.value); });
window.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && active) {
    if (paused) resumeGame();
    else pauseGame();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && active && !paused) pauseGame();
});
window.addEventListener("contextmenu", (event) => event.preventDefault());
window.addEventListener("error", () => showToast("Ocorreu um erro. Volte ao lobby e tente novamente."));

if (socket) {
  socket.on("connect", () => {
    setConnection(true, "Servidor online");
    showLobbyMessage("Multiplayer conectado. Crie uma sala ou procure uma partida.", "success");
  });
  socket.on("disconnect", () => {
    setConnection(false, "Reconectando");
    if (active && currentMode === "multiplayer") {
      networkToast.textContent = "CONEXÃO PERDIDA — tentando reconectar";
      networkToast.classList.remove("hidden");
    }
    showLobbyMessage("Conexão interrompida. O treino solo continua disponível.", "error");
  });
  socket.on("connect_error", () => {
    setConnection(false, "Servidor indisponível");
    showLobbyMessage("Não foi possível conectar ao multiplayer. O treino solo continua disponível.", "error");
  });
  socket.on("room:state", (room) => renderRoom(room));
  socket.on("room:error", (message) => showLobbyMessage(message, "error"));
  socket.on("game:start", (room) => {
    currentRoom = room;
    startGame("multiplayer");
  });
  socket.on("player:fire", (shot) => { if (game && active) game.addRemoteShot(shot); });
  socket.on("player:move", (player) => {
    if (!currentRoom || !player || !player.id) return;
    const index = currentRoom.players.findIndex((item) => item.id === player.id);
    if (index >= 0) currentRoom.players[index] = { ...currentRoom.players[index], ...player };
    if (game) game.setRemotePlayers(currentRoom.players.filter((item) => item.id !== socket.id));
  });
  socket.on("game:player-left", (playerId) => {
    if (!currentRoom) return;
    currentRoom.players = currentRoom.players.filter((player) => player.id !== playerId);
    if (game) game.setRemotePlayers(currentRoom.players.filter((player) => player.id !== socket.id));
  });
} else {
  setConnection(false, "Servidor indisponível");
  showLobbyMessage("Multiplayer indisponível neste servidor. Use o treino solo.", "error");
}

updateHud({ health: 100, score: 0, ammo: "12 / 60" });

window.__zeroModuleReady = true;
