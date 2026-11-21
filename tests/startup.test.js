import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../public/js/main.js", import.meta.url), "utf8");
const game = readFileSync(new URL("../public/js/game.js", import.meta.url), "utf8");
const config = readFileSync(new URL("../public/js/config.js", import.meta.url), "utf8");

test("lobby contains the loading screen and all controls required by InputController", () => {
  for (const id of [
    "loading-screen", "loading-bar", "loading-percent", "loading-message",
    "solo-button", "joystick-zone", "joystick-base", "joystick-knob",
    "look-zone", "fire-button", "jump-button", "sprint-button",
    "reload-button", "camera-button"
  ]) {
    assert.match(html, new RegExp('id="' + id + '"'), "missing #" + id);
  }
});

test("solo startup waits for UI frames and renders before hiding the lobby", () => {
  assert.match(main, /async function startGame\(mode\)/);
  assert.match(main, /await nextFrame\(\)/);
  assert.match(main, /game\.renderFrame\(\)/);
  assert.ok(main.indexOf("game.renderFrame()") < main.indexOf('lobby.classList.add("hidden")'));
  assert.match(main, /startupInProgress/);
  assert.match(main, /reportClientError\("startGame", error\)/);
});

test("game supports first-frame rendering and permanently daytime lighting", () => {
  assert.match(game, /renderFrame\(\)/);
  assert.match(game, /this\.dayPhase = 0\.25/);
  assert.match(game, /this\.scene\.background\.set\(0x91c8ed\)/);
  assert.match(config, /mapSize: 220/);
  assert.match(game, /treeCount = 126/);
});
