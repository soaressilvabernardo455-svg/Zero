import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../public/js/main.js", import.meta.url), "utf8");
const game = readFileSync(new URL("../public/js/game.js", import.meta.url), "utf8");
const config = readFileSync(new URL("../public/js/config.js", import.meta.url), "utf8");
const input = readFileSync(new URL("../public/js/input.js", import.meta.url), "utf8");

test("lobby contains the loading screen and all controls used by the game", () => {
  for (const id of [
    "loading-screen", "loading-bar", "loading-percent", "loading-message",
    "solo-button", "joystick-zone", "joystick-base", "joystick-knob",
    "look-zone", "fire-button", "jump-button", "sprint-button",
    "world-area", "world-time", "fps-value", "reload-button", "camera-button"
  ]) {
    assert.match(html, new RegExp('id="' + id + '"'), "missing #" + id);
  }
});

test("every static DOM reference used by the game exists in the HTML", () => {
  const references = [...new Set([main, input].flatMap((source) =>
    [...source.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map((match) => match[1])
  ))];
  for (const id of references) {
    assert.match(html, new RegExp('id="' + id + '"'), "JavaScript references missing #" + id);
  }
});

test("solo startup waits for UI frames and renders before hiding the lobby", () => {
  assert.match(main, /async function startGame\(mode\)/);
  assert.match(main, /await nextFrame\(\)/);
  assert.match(main, /game\.renderFrame\(\)/);
  assert.ok(main.indexOf("game.renderFrame()") < main.indexOf('lobby.classList.add("hidden")'));
  assert.match(main, /startupInProgress/);
  assert.match(main, /reportClientError\("startGame", error\)/);
  assert.match(main, /pointerup/);
  assert.match(main, /reportClientError\("game-loop", error\)/);
});

test("game supports first-frame rendering and permanent daylight", () => {
  assert.match(game, /renderFrame\(\)/);
  assert.match(game, /this\.dayPhase = 0\.25/);
  assert.match(game, /this\.scene\.background\.set\(0x91c8ed\)/);
  assert.match(config, /mapSize: 220/);
  assert.match(game, /treeCount = 126/);
});
