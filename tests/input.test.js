import test from "node:test";
import assert from "node:assert/strict";
import { InputController } from "../public/js/input.js";

test("W e o analógico para cima avançam; S recua", () => {
  const input = Object.create(InputController.prototype);
  input.move = { x: 0, y: 0 };
  input.look = { x: 0, y: 0 };
  input.keys = new Set(["KeyW"]);
  input.jumpPressed = false;
  input.firePressed = false;
  input.reloadPressed = false;
  input.cameraPressed = false;
  input.sprintPressed = false;
  assert.equal(input.consume().moveY, 1);
  input.keys = new Set(["KeyS"]);
  assert.equal(input.consume().moveY, -1);
  input.keys = new Set();
  input.move = { x: 0, y: 1 };
  assert.equal(input.consume().moveY, 1);
});
