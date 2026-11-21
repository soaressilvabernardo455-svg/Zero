import { clamp } from "./config.js";

export class InputController {
  constructor(canvas, sensitivity = 1) {
    this.canvas = canvas;
    this.sensitivity = sensitivity;
    this.keys = new Set();
    this.move = { x: 0, y: 0 };
    this.look = { x: 0, y: 0 };
    this.jumpPressed = false;
    this.firePressed = false;
    this.reloadPressed = false;
    this.cameraPressed = false;
    this.pointerLocked = false;
    this.joyPointer = null;
    this.lookPointer = null;
    this.lastLook = null;
    this.joyCenter = null;
    this.joyRadius = 48;
    this.bind();
  }

  bind() {
    window.addEventListener("keydown", e => {
      this.keys.add(e.code);
      if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();
      if (e.code === "Space") this.jumpPressed = true;
      if (e.code === "KeyR") this.reloadPressed = true;
      if (e.code === "KeyC") this.cameraPressed = true;
    });
    window.addEventListener("keyup", e => this.keys.delete(e.code));
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.firePressed = false;
    });

    this.canvas.addEventListener("click", () => {
      if (matchMedia("(pointer:fine)").matches && !this.pointerLocked) this.canvas.requestPointerLock?.();
    });
    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (!this.pointerLocked) this.firePressed = false;
    });
    document.addEventListener("mousemove", e => {
      if (this.pointerLocked) {
        this.look.x += e.movementX * 0.0022 * this.sensitivity;
        this.look.y += e.movementY * 0.0022 * this.sensitivity;
      }
    });
    document.addEventListener("mousedown", e => {
      if (e.button === 0 && this.pointerLocked) this.firePressed = true;
    });
    document.addEventListener("mouseup", e => {
      if (e.button === 0) this.firePressed = false;
    });

    const joy = document.getElementById("joystick-zone");
    const knob = document.getElementById("joystick-knob");
    joy.addEventListener("pointerdown", e => {
      this.joyPointer = e.pointerId;
      joy.setPointerCapture(e.pointerId);
      const rect = document.getElementById("joystick-base").getBoundingClientRect();
      this.joyCenter = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
      this.updateJoystick(e, knob);
    });
    joy.addEventListener("pointermove", e => {
      if (e.pointerId === this.joyPointer) this.updateJoystick(e, knob);
    });
    const releaseJoy = e => {
      if (e.pointerId !== this.joyPointer) return;
      this.joyPointer = null;
      this.move = { x: 0, y: 0 };
      knob.style.transform = "translate(0,0)";
    };
    joy.addEventListener("pointerup", releaseJoy);
    joy.addEventListener("pointercancel", releaseJoy);

    const lookZone = document.getElementById("look-zone");
    lookZone.addEventListener("pointerdown", e => {
      this.lookPointer = e.pointerId;
      this.lastLook = { x: e.clientX, y: e.clientY };
      lookZone.setPointerCapture(e.pointerId);
    });
    lookZone.addEventListener("pointermove", e => {
      if (e.pointerId !== this.lookPointer || !this.lastLook) return;
      this.look.x += (e.clientX - this.lastLook.x) * 0.008 * this.sensitivity;
      this.look.y += (e.clientY - this.lastLook.y) * 0.008 * this.sensitivity;
      this.lastLook = { x: e.clientX, y: e.clientY };
    });
    const releaseLook = e => {
      if (e.pointerId === this.lookPointer) {
        this.lookPointer = null;
        this.lastLook = null;
      }
    };
    lookZone.addEventListener("pointerup", releaseLook);
    lookZone.addEventListener("pointercancel", releaseLook);

    const fire = document.getElementById("fire-button");
    fire.addEventListener("pointerdown", e => { e.preventDefault(); this.firePressed = true; fire.setPointerCapture(e.pointerId); });
    const stopFire = () => { this.firePressed = false; };
    fire.addEventListener("pointerup", stopFire);
    fire.addEventListener("pointercancel", stopFire);
    fire.addEventListener("lostpointercapture", stopFire);
    document.getElementById("jump-button").addEventListener("pointerdown", e => { e.preventDefault(); this.jumpPressed = true; });
    document.getElementById("reload-button").addEventListener("click", () => { this.reloadPressed = true; });
    document.getElementById("camera-button").addEventListener("click", () => { this.cameraPressed = true; });
  }

  updateJoystick(e, knob) {
    if (!this.joyCenter) return;
    const dx = e.clientX - this.joyCenter.x;
    const dy = e.clientY - this.joyCenter.y;
    const length = Math.hypot(dx, dy);
    const scale = length > this.joyRadius ? this.joyRadius / length : 1;
    const x = dx * scale, y = dy * scale;
    this.move = { x: x / this.joyRadius, y: y / this.joyRadius };
    knob.style.transform = "translate(" + x + "px," + y + "px)";
  }

  consume() {
    const result = {
      moveX: this.move.x + (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0),
      moveY: this.move.y + (this.keys.has("KeyS") ? 1 : 0) - (this.keys.has("KeyW") ? 1 : 0),
      lookX: this.look.x,
      lookY: this.look.y,
      jump: this.jumpPressed || this.keys.has("Space"),
      fire: this.firePressed,
      reload: this.reloadPressed,
      camera: this.cameraPressed,
      sprint: this.keys.has("ShiftLeft") || this.keys.has("ShiftRight")
    };
    this.look = { x: 0, y: 0 };
    this.jumpPressed = this.reloadPressed = this.cameraPressed = false;
    return result;
  }

  setSensitivity(value) {
    this.sensitivity = clamp(Number(value) || 1, 0.4, 2.5);
  }
}