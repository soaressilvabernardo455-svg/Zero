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
    this.sprintPressed = false;
    this.crouch = false;
    this.prone = false;
    this.crouchPressed = false;
    this.pronePressed = false;
    this.pointerLocked = false;
    this.joyPointer = null;
    this.lookPointer = null;
    this.lastLook = null;
    this.joyCenter = null;
    this.joyRadius = 48;
    this.bind();
  }

  bind() {
    window.addEventListener("keydown", (event) => {
      this.keys.add(event.code);
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
      if (event.code === "Space") this.jumpPressed = true;
      if (event.code === "KeyR") this.reloadPressed = true;
      if (event.code === "KeyC") this.cameraPressed = true;
      if (event.code === "ControlLeft" || event.code === "ControlRight") this.crouchPressed = true;
      if (event.code === "KeyZ") this.pronePressed = true;
    });
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.firePressed = false;
      this.sprintPressed = false;
    });

    this.canvas.addEventListener("click", () => {
      if (matchMedia("(pointer:fine)").matches && !this.pointerLocked) this.canvas.requestPointerLock?.();
    });
    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (!this.pointerLocked) this.firePressed = false;
    });
    document.addEventListener("mousemove", (event) => {
      if (!this.pointerLocked) return;
      this.look.x += event.movementX * 0.0022 * this.sensitivity;
      this.look.y += event.movementY * 0.0022 * this.sensitivity;
    });
    document.addEventListener("mousedown", (event) => {
      if (event.button === 0 && this.pointerLocked) this.firePressed = true;
    });
    document.addEventListener("mouseup", (event) => {
      if (event.button === 0) this.firePressed = false;
    });

    const joy = document.getElementById("joystick-zone");
    const knob = document.getElementById("joystick-knob");
    joy.addEventListener("pointerdown", (event) => {
      this.joyPointer = event.pointerId;
      joy.setPointerCapture(event.pointerId);
      const rect = document.getElementById("joystick-base").getBoundingClientRect();
      this.joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this.updateJoystick(event, knob);
    });
    joy.addEventListener("pointermove", (event) => {
      if (event.pointerId === this.joyPointer) this.updateJoystick(event, knob);
    });
    const releaseJoy = (event) => {
      if (event.pointerId !== this.joyPointer) return;
      this.joyPointer = null;
      this.move = { x: 0, y: 0 };
      knob.style.transform = "translate(0,0)";
    };
    joy.addEventListener("pointerup", releaseJoy);
    joy.addEventListener("pointercancel", releaseJoy);
    joy.addEventListener("lostpointercapture", releaseJoy);

    const lookZone = document.getElementById("look-zone");
    lookZone.addEventListener("pointerdown", (event) => {
      this.lookPointer = event.pointerId;
      this.lastLook = { x: event.clientX, y: event.clientY };
      lookZone.setPointerCapture(event.pointerId);
    });
    lookZone.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.lookPointer || !this.lastLook) return;
      this.look.x += (event.clientX - this.lastLook.x) * 0.007 * this.sensitivity;
      this.look.y += (event.clientY - this.lastLook.y) * 0.007 * this.sensitivity;
      this.lastLook = { x: event.clientX, y: event.clientY };
    });
    const releaseLook = (event) => {
      if (event.pointerId === this.lookPointer) {
        this.lookPointer = null;
        this.lastLook = null;
      }
    };
    lookZone.addEventListener("pointerup", releaseLook);
    lookZone.addEventListener("pointercancel", releaseLook);
    lookZone.addEventListener("lostpointercapture", releaseLook);

    const fire = document.getElementById("fire-button");
    fire.addEventListener("pointerdown", (event) => {
      event.preventDefault(); this.firePressed = true; fire.setPointerCapture(event.pointerId);
    });
    const stopFire = () => { this.firePressed = false; };
    fire.addEventListener("pointerup", stopFire);
    fire.addEventListener("pointercancel", stopFire);
    fire.addEventListener("lostpointercapture", stopFire);

    const jump = document.getElementById("jump-button");
    jump.addEventListener("pointerdown", (event) => { event.preventDefault(); this.jumpPressed = true; });
    const crouch = document.getElementById("crouch-button");
    const prone = document.getElementById("prone-button");
    const bindToggle = (button, key) => {
      const toggle = (event) => {
        event.preventDefault();
        this[key] = !this[key];
        button.classList.toggle("active", this[key]);
        button.setAttribute("aria-pressed", String(this[key]));
        if (this[key === "prone" ? "prone" : "crouch"]) {
          const other = key === "prone" ? crouch : prone;
          const otherKey = key === "prone" ? "crouch" : "prone";
          this[otherKey] = false;
          other.classList.remove("active");
          other.setAttribute("aria-pressed", "false");
        }
      };
      button.addEventListener("pointerdown", toggle);
      button.addEventListener("click", (event) => { if (event.detail === 0) toggle(event); });
    };
    bindToggle(crouch, "crouch");
    bindToggle(prone, "prone");
    const sprint = document.getElementById("sprint-button");
    const stopSprint = () => { this.sprintPressed = false; sprint.classList.remove("active"); };
    sprint.addEventListener("pointerdown", (event) => {
      event.preventDefault(); this.sprintPressed = true; sprint.classList.add("active"); sprint.setPointerCapture(event.pointerId);
    });
    sprint.addEventListener("pointerup", stopSprint);
    sprint.addEventListener("pointercancel", stopSprint);
    sprint.addEventListener("lostpointercapture", stopSprint);

    document.getElementById("reload-button").addEventListener("click", () => { this.reloadPressed = true; });
    document.getElementById("camera-button").addEventListener("click", () => { this.cameraPressed = true; });
  }

  updateJoystick(event, knob) {
    if (!this.joyCenter) return;
    const dx = event.clientX - this.joyCenter.x;
    const dy = event.clientY - this.joyCenter.y;
    const length = Math.hypot(dx, dy);
    const scale = length > this.joyRadius ? this.joyRadius / length : 1;
    const x = dx * scale;
    const y = dy * scale;
    // Up on the stick means forward in the world.
    this.move = { x: x / this.joyRadius, y: -y / this.joyRadius };
    knob.style.transform = "translate(" + x + "px," + y + "px)";
  }

  consume() {
    const result = {
      moveX: this.move.x + (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0),
      moveY: this.move.y + (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0),
      lookX: this.look.x,
      lookY: this.look.y,
      jump: this.jumpPressed || this.keys.has("Space"),
      fire: this.firePressed,
      reload: this.reloadPressed,
      camera: this.cameraPressed,
      sprint: this.sprintPressed || this.keys.has("ShiftLeft") || this.keys.has("ShiftRight"),
      crouch: this.crouch,
      prone: this.prone
    };
    this.look = { x: 0, y: 0 };
    this.jumpPressed = this.reloadPressed = this.cameraPressed = false;
    if (this.crouchPressed) { this.crouch = !this.crouch; if (this.crouch) this.prone = false; }
    if (this.pronePressed) { this.prone = !this.prone; if (this.prone) this.crouch = false; }
    this.crouchPressed = this.pronePressed = false;
    return result;
  }

  setSensitivity(value) {
    this.sensitivity = clamp(Number(value) || 1, 0.4, 2.5);
  }
}
