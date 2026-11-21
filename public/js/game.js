import * as THREE from "three";
import { CONFIG, clamp, normalize2 } from "./config.js";

function makeFloorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#26394a";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1300; i++) {
    const shade = 36 + Math.floor(Math.random() * 28);
    ctx.fillStyle = "rgba(" + shade + "," + (shade + 12) + "," + (shade + 18) + ",0.16)";
    const size = Math.random() * 2.5 + 0.5;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, size, size);
  }
  ctx.strokeStyle = "rgba(126,174,198,.16)";
  ctx.lineWidth = 2;
  for (let p = 0; p <= 512; p += 64) {
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(75,220,255,.15)";
  ctx.lineWidth = 3;
  for (let p = 32; p < 512; p += 128) {
    ctx.beginPath(); ctx.moveTo(p, 8); ctx.lineTo(p, 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, p); ctx.lineTo(40, p); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeGlow(color, intensity = 1.2) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    metalness: 0.25,
    roughness: 0.35
  });
}

export class Game {
  constructor(canvas, onHud) {
    this.canvas = canvas;
    this.onHud = onHud;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101e31);
    this.scene.fog = new THREE.Fog(0x101e31, 48, 145);
    this.camera = new THREE.PerspectiveCamera(74, 1, 0.1, 220);
    const mobile = matchMedia("(pointer:coarse)").matches;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !mobile,
      powerPreference: "high-performance",
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6));
    this.renderer.shadowMap.enabled = !mobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    this.player = new THREE.Vector3(0, 0, 13);
    this.velocityY = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.grounded = true;
    this.health = 100;
    this.score = 0;
    this.ammo = CONFIG.magazineSize;
    this.reserve = CONFIG.reserveAmmo;
    this.cooldown = 0;
    this.reloadTime = 0;
    this.cameraMode = 0;
    this.clock = 0;
    this.targets = [];
    this.projectiles = [];
    this.colliders = [];
    this.cameraBlockers = [];
    this.remotePlayers = new Map();
    this.createWorld();
    this.resize();
    this._resize = () => this.resize();
    window.addEventListener("resize", this._resize);
  }

  createWorld() {
    this.scene.add(new THREE.HemisphereLight(0xb9e7ff, 0x172437, 1.65));
    const keyLight = new THREE.DirectionalLight(0xb9e5ff, 2.15);
    keyLight.position.set(-30, 48, 22);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -62;
    keyLight.shadow.camera.right = 62;
    keyLight.shadow.camera.top = 62;
    keyLight.shadow.camera.bottom = -62;
    keyLight.shadow.bias = -0.00025;
    this.scene.add(keyLight);
    const warmFill = new THREE.PointLight(0x267dff, 28, 72, 2);
    warmFill.position.set(0, 12, -28);
    this.scene.add(warmFill);
    const amberFill = new THREE.PointLight(0xff9c4b, 18, 48, 2);
    amberFill.position.set(30, 10, 24);
    this.scene.add(amberFill);

    const floorMat = new THREE.MeshStandardMaterial({
      map: makeFloorTexture(), color: 0xa8bbc7, roughness: 0.88, metalness: 0.12
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(124, 124), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(112, 1.2, 112),
      new THREE.MeshStandardMaterial({ color: 0x17283a, metalness: 0.45, roughness: 0.7 })
    );
    platform.position.y = -0.72;
    platform.receiveShadow = true;
    this.scene.add(platform);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x263c53, metalness: 0.52, roughness: 0.58 });
    const wallTrim = makeGlow(0x1686b8, 0.7);
    this.addBox(-55, 0, 0, 2.2, 10, 112, wallMat, true);
    this.addBox(55, 0, 0, 2.2, 10, 112, wallMat, true);
    this.addBox(0, 0, -55, 112, 10, 2.2, wallMat, true);
    this.addBox(0, 0, 55, 112, 10, 2.2, wallMat, true);
    for (let p = -42; p <= 42; p += 14) {
      this.addBox(p, 0.18, -53.72, 0.16, 0.12, 0.12, wallTrim, false);
      this.addBox(p, 0.18, 53.72, 0.16, 0.12, 0.12, wallTrim, false);
    }

    const armor = new THREE.MeshStandardMaterial({ color: 0x344b62, metalness: 0.55, roughness: 0.46 });
    const darkArmor = new THREE.MeshStandardMaterial({ color: 0x172638, metalness: 0.48, roughness: 0.62 });
    const cyan = makeGlow(0x29bce8, 1.1);
    const amber = makeGlow(0xffa34e, 0.85);
    const addModule = (x, z, w, h, d, material = armor, accent = cyan) => {
      this.addBox(x, 0, z, w, h, d, material, true);
      this.addBox(x, h * 0.72, z - d / 2 - 0.035, w * 0.78, 0.09, 0.07, accent, false);
      this.addBox(x - w * 0.38, h * 0.52, z - d / 2 - 0.045, 0.08, h * 0.22, 0.08, amber, false);
    };

    addModule(-18, -15, 13, 6.2, 3.1, armor, cyan);
    addModule(18, -18, 11, 5.2, 3.1, darkArmor, amber);
    addModule(-31, 8, 4.2, 5.8, 15, darkArmor, cyan);
    addModule(31, 10, 4.2, 5.8, 15, armor, amber);
    addModule(-10, 3, 5.5, 2.0, 4.4, armor, amber);
    addModule(10, -2, 5.5, 2.0, 4.4, armor, cyan);
    addModule(0, -34, 17, 4.1, 3.0, darkArmor, cyan);
    addModule(-23, 30, 8.5, 3.1, 3.2, armor, amber);
    addModule(23, 29, 8.5, 3.1, 3.2, armor, cyan);

    for (const p of [[-43, -38], [43, -38], [-43, 38], [43, 38], [0, -48]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 7.8, 8), armor);
      pole.position.set(p[0], 3.9, p[1]); pole.castShadow = true; this.scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), cyan);
      lamp.position.set(p[0], 7.8, p[1]); this.scene.add(lamp);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.08, 6, 16), amber);
      ring.rotation.x = Math.PI / 2; ring.position.set(p[0], 0.2, p[1]); this.scene.add(ring);
      this.colliders.push({ x: p[0], z: p[1], halfX: 0.7, halfZ: 0.7 });
    }

    const laneMat = new THREE.MeshBasicMaterial({ color: 0x2d9fce, transparent: true, opacity: 0.34 });
    for (let x = -42; x <= 42; x += 14) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.018, 75), laneMat);
      line.position.set(x, 0.015, 0); this.scene.add(line);
    }
    for (const [x, z] of [[0, 0], [-27, -26], [27, -26], [-27, 26], [27, 26]]) {
      const pad = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.07, 6, 48), makeGlow(0x268fba, 0.55));
      pad.rotation.x = Math.PI / 2; pad.position.set(x, 0.08, z); this.scene.add(pad);
      const center = new THREE.Mesh(new THREE.CircleGeometry(2.65, 32), new THREE.MeshBasicMaterial({ color: 0x183044, transparent: true, opacity: 0.28 }));
      center.rotation.x = -Math.PI / 2; center.position.set(x, 0.025, z); this.scene.add(center);
    }

    this.playerVisual = this.createSoldier(0x267dcc, 0x55e1ff);
    this.scene.add(this.playerVisual);
    this.targetMaterial = new THREE.MeshStandardMaterial({ color: 0xf06b48, metalness: 0.42, roughness: 0.4 });
    const targetSpots = [
      [-30, -28], [-10, -22], [12, -29], [31, -25],
      [-31, 0], [29, 0], [-17, 24], [14, 28]
    ];
    targetSpots.slice(0, CONFIG.targetCount).forEach((spot, index) => this.createTarget(spot[0], spot[1], index));

    this.camera.position.set(0, 1.65, 13);
  }

  addBox(x, y, z, w, h, d, material, collidable = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    if (collidable) {
      this.colliders.push({ x, z, halfX: w / 2, halfZ: d / 2 });
      this.cameraBlockers.push(mesh);
    }
    return mesh;
  }

  createSoldier(primaryColor, accentColor) {
    const root = new THREE.Group();
    const armor = new THREE.MeshStandardMaterial({ color: primaryColor, metalness: 0.48, roughness: 0.42 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x172537, metalness: 0.42, roughness: 0.6 });
    const glow = makeGlow(accentColor, 1.0);
    const addPart = (geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
      mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
      return mesh;
    };

    addPart(new THREE.BoxGeometry(0.58, 0.34, 0.34), dark, 0, 0.82, 0);
    addPart(new THREE.CapsuleGeometry(0.34, 0.54, 4, 8), armor, 0, 1.28, 0, 1, 1, 0.88);
    addPart(new THREE.BoxGeometry(0.58, 0.22, 0.12), glow, 0, 1.4, -0.27);
    addPart(new THREE.SphereGeometry(0.25, 12, 10), dark, 0, 1.94, 0);
    addPart(new THREE.SphereGeometry(0.2, 12, 10), armor, 0, 1.98, -0.025);
    addPart(new THREE.BoxGeometry(0.31, 0.085, 0.055), glow, 0, 1.99, -0.205);
    addPart(new THREE.BoxGeometry(0.2, 0.12, 0.18), dark, -0.4, 1.47, 0);
    addPart(new THREE.BoxGeometry(0.2, 0.12, 0.18), dark, 0.4, 1.47, 0);
    const leftArm = addPart(new THREE.CapsuleGeometry(0.105, 0.42, 3, 6), armor, -0.43, 1.13, -0.01);
    leftArm.rotation.z = -0.12;
    const rightArm = addPart(new THREE.CapsuleGeometry(0.105, 0.42, 3, 6), armor, 0.43, 1.13, -0.01);
    rightArm.rotation.z = 0.12;
    addPart(new THREE.BoxGeometry(0.19, 0.22, 0.22), glow, 0.43, 0.92, -0.045);
    const leftLeg = addPart(new THREE.CapsuleGeometry(0.13, 0.48, 3, 6), dark, -0.17, 0.42, 0);
    const rightLeg = addPart(new THREE.CapsuleGeometry(0.13, 0.48, 3, 6), dark, 0.17, 0.42, 0);
    addPart(new THREE.BoxGeometry(0.25, 0.16, 0.42), armor, -0.17, 0.12, -0.055);
    addPart(new THREE.BoxGeometry(0.25, 0.16, 0.42), armor, 0.17, 0.12, -0.055);
    addPart(new THREE.BoxGeometry(0.42, 0.46, 0.22), dark, 0, 1.36, 0.28);
    addPart(new THREE.BoxGeometry(0.16, 0.25, 0.08), glow, 0, 1.39, 0.405);
    root.userData.parts = { leftArm, rightArm, leftLeg, rightLeg };
    return root;
  }

  createTarget(x, z, index) {
    const bot = new THREE.Group();
    const bodyMat = this.targetMaterial.clone();
    const dark = new THREE.MeshStandardMaterial({ color: 0x202c3b, metalness: 0.58, roughness: 0.42 });
    const eye = makeGlow(0xffd36a, 1.4);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.48, 0.76, 10), bodyMat);
    body.position.y = 1.1; body.castShadow = true; bot.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), dark);
    head.position.y = 1.68; head.castShadow = true; bot.add(head);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.09), eye);
    visor.position.set(0, 1.69, -0.31); bot.add(visor);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), eye);
    core.position.set(0, 1.12, -0.42); bot.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.055, 6, 20), makeGlow(0xff7b52, 0.85));
    ring.position.y = 1.12; bot.add(ring);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.38, 3, 6), dark);
      arm.position.set(side * 0.51, 1.05, 0); arm.rotation.z = side * -0.35; bot.add(arm);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.5, 7), dark);
      leg.position.set(side * 0.2, 0.37, 0); bot.add(leg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.34), bodyMat);
      foot.position.set(side * 0.2, 0.1, -0.045); bot.add(foot);
    }
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.045, 6, 28), makeGlow(0x4bdcff, 0.8));
    halo.rotation.x = Math.PI / 2; halo.position.y = 0.06; bot.add(halo);
    bot.position.set(x, 0, z);
    bot.userData = { originX: x, originZ: z, phase: index * 0.82, hit: 0, meshes: [] };
    bot.traverse((obj) => { if (obj.isMesh) bot.userData.meshes.push(obj); });
    this.scene.add(bot);
    this.targets.push(bot);
  }

  resize() {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  setQuality(level) {
    const mobile = matchMedia("(pointer:coarse)").matches;
    const ratio = level === "low" ? 0.9 : level === "high" ? Math.min(window.devicePixelRatio || 1, mobile ? 1.35 : 1.8) : Math.min(window.devicePixelRatio || 1, mobile ? 1.15 : 1.5);
    this.renderer.setPixelRatio(ratio);
    this.renderer.shadowMap.enabled = level === "high" && !mobile;
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
  }

  setRemotePlayers(players) {
    const activeIds = new Set();
    players.forEach((player, index) => {
      if (!player || !player.id) return;
      activeIds.add(player.id);
      let remote = this.remotePlayers.get(player.id);
      const x = Number.isFinite(player.x) ? clamp(player.x, -49, 49) : 0;
      const z = Number.isFinite(player.z) ? clamp(player.z, -49, 49) : 0;
      const yaw = Number.isFinite(player.yaw) ? player.yaw : 0;
      if (!remote) {
        const palette = [0xd17b32, 0x4a9c7b, 0x8d64c7, 0xc65c67, 0x4b9cc4];
        const avatar = this.createSoldier(palette[index % palette.length], 0x8eeeff);
        avatar.position.set(x, 0, z);
        const labelCanvas = document.createElement("canvas");
        labelCanvas.width = 256; labelCanvas.height = 64;
        const labelContext = labelCanvas.getContext("2d");
        labelContext.fillStyle = "rgba(5,16,28,.78)";
        labelContext.fillRect(8, 8, 240, 48);
        labelContext.strokeStyle = "rgba(106,226,255,.85)";
        labelContext.lineWidth = 2;
        labelContext.strokeRect(8, 8, 240, 48);
        labelContext.fillStyle = "#eafaff";
        labelContext.font = "bold 23px Arial";
        labelContext.textAlign = "center";
        labelContext.textBaseline = "middle";
        labelContext.fillText(String(player.name || "Jogador").slice(0, 16), 128, 33);
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        labelTexture.colorSpace = THREE.SRGBColorSpace;
        const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture, transparent: true, depthWrite: false }));
        label.position.y = 2.62;
        label.scale.set(2.25, 0.56, 1);
        avatar.add(label);
        this.scene.add(avatar);
        remote = { avatar, name: String(player.name || "Jogador").slice(0, 16), target: { x, z, yaw } };
        this.remotePlayers.set(player.id, remote);
      }
      remote.target = { x, z, yaw };
    });
    for (const [id, remote] of this.remotePlayers) {
      if (!activeIds.has(id)) {
        this.scene.remove(remote.avatar);
        this.remotePlayers.delete(id);
      }
    }
  }

  getNetworkState() {
    return { x: this.player.x, z: this.player.z, yaw: this.yaw, pitch: this.pitch };
  }

  fire() {
    if (this.cooldown > 0 || this.reloadTime > 0) return;
    if (this.ammo <= 0) { this.reload(); return; }
    this.ammo--;
    this.cooldown = CONFIG.fireCooldown;
    const direction = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();
    const origin = this.camera.position.clone();
    const bolt = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0x7ceaff })
    );
    bolt.position.copy(origin);
    this.scene.add(bolt);
    const shotDirection = direction.clone();
    this.projectiles.push({ mesh: bolt, velocity: direction.multiplyScalar(CONFIG.projectileSpeed), life: 1.8, previous: origin.clone() });
    this.lastShot = {
      origin: { x: origin.x, y: origin.y, z: origin.z },
      direction: { x: shotDirection.x, y: shotDirection.y, z: shotDirection.z }
    };
    this.lastShotSequence = (this.lastShotSequence || 0) + 1;
    this.onHud({ ammo: this.ammo + " / " + this.reserve });
  }

  addRemoteShot(shot) {
    if (!shot || !shot.origin || !shot.direction) return;
    const values = [shot.origin.x, shot.origin.y, shot.origin.z, shot.direction.x, shot.direction.y, shot.direction.z];
    if (!values.every(Number.isFinite)) return;
    const origin = new THREE.Vector3(clamp(shot.origin.x, -60, 60), clamp(shot.origin.y, 0.2, 8), clamp(shot.origin.z, -60, 60));
    const direction = new THREE.Vector3(shot.direction.x, shot.direction.y, shot.direction.z);
    if (direction.lengthSq() < 0.5 || direction.lengthSq() > 1.5) return;
    direction.normalize();
    const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffc77c }));
    bolt.position.copy(origin);
    this.scene.add(bolt);
    this.projectiles.push({ mesh: bolt, velocity: direction.multiplyScalar(CONFIG.projectileSpeed), life: 1.35, previous: origin.clone(), remote: true });
  }

  reload() {
    if (this.reloadTime > 0 || this.ammo === CONFIG.magazineSize || this.reserve <= 0) return;
    this.reloadTime = 1.2;
  }

  hitTarget(projectile, stepLength) {
    const direction = projectile.velocity.clone().normalize();
    const ray = new THREE.Raycaster(projectile.previous, direction, 0, stepLength + 0.42);
    for (const target of this.targets) {
      if (target.userData.hit > 0 || !target.visible) continue;
      if (ray.intersectObjects(target.userData.meshes, false).length) {
        target.userData.hit = 1.05;
        this.score++;
        this.onHud({ score: this.score, hit: true });
        return true;
      }
    }
    return false;
  }

  moveWithCollision(dx, dz) {
    const radius = 0.5;
    const nextX = clamp(this.player.x + dx, -50, 50);
    if (!this.colliders.some((c) => Math.abs(nextX - c.x) < c.halfX + radius && Math.abs(this.player.z - c.z) < c.halfZ + radius)) this.player.x = nextX;
    const nextZ = clamp(this.player.z + dz, -50, 50);
    if (!this.colliders.some((c) => Math.abs(this.player.x - c.x) < c.halfX + radius && Math.abs(nextZ - c.z) < c.halfZ + radius)) this.player.z = nextZ;
  }

  update(dt, input) {
    dt = Math.min(Math.max(dt, 0), 0.04);
    this.clock += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (input.reload) this.reload();
    if (input.camera) this.cameraMode = (this.cameraMode + 1) % 3;
    if (input.fire) this.fire();
    this.yaw -= input.lookX;
    this.pitch = clamp(this.pitch - input.lookY, -1.1, 1.1);

    const move = normalize2(input.moveX, input.moveY);
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const speed = CONFIG.playerSpeed * (input.sprint ? CONFIG.sprintMultiplier : 1);
    const delta = new THREE.Vector3()
      .addScaledVector(forward, move.y * speed * dt)
      .addScaledVector(right, move.x * speed * dt);
    this.moveWithCollision(delta.x, delta.z);

    if (input.jump && this.grounded) { this.velocityY = CONFIG.jumpVelocity; this.grounded = false; }
    this.velocityY -= CONFIG.gravity * dt;
    this.player.y += this.velocityY * dt;
    if (this.player.y < 0) { this.player.y = 0; this.velocityY = 0; this.grounded = true; }

    this.playerVisual.position.copy(this.player);
    this.playerVisual.rotation.y = this.yaw;
    this.playerVisual.visible = this.cameraMode !== 0;
    const parts = this.playerVisual.userData.parts;
    const moving = Math.min(1, Math.hypot(move.x, move.y));
    const stride = Math.sin(this.clock * 10) * 0.48 * moving;
    parts.leftLeg.rotation.x = stride;
    parts.rightLeg.rotation.x = -stride;
    parts.leftArm.rotation.x = -stride * 0.58;
    parts.rightArm.rotation.x = stride * 0.58;

    for (const target of this.targets) {
      target.userData.phase += dt;
      target.position.x = target.userData.originX + Math.sin(target.userData.phase * 0.8) * 1.15;
      target.position.y = Math.sin(target.userData.phase * 1.8) * 0.09;
      target.rotation.y = Math.sin(target.userData.phase * 0.55) * 0.22;
      target.userData.hit = Math.max(0, target.userData.hit - dt);
      target.visible = target.userData.hit <= 0;
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.previous.copy(projectile.mesh.position);
      const stepLength = projectile.velocity.length() * dt;
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      projectile.life -= dt;
      const hit = projectile.remote ? false : this.hitTarget(projectile, stepLength);
      if (hit || projectile.life <= 0 || projectile.mesh.position.length() > 180) {
        this.scene.remove(projectile.mesh);
        projectile.mesh.geometry.dispose();
        projectile.mesh.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }

    if (this.reloadTime > 0) {
      this.reloadTime -= dt;
      if (this.reloadTime <= 0) {
        const amount = Math.min(CONFIG.magazineSize - this.ammo, this.reserve);
        this.ammo += amount; this.reserve -= amount;
        this.onHud({ ammo: this.ammo + " / " + this.reserve });
      }
    }
    for (const remote of this.remotePlayers.values()) {
      const remoteParts = remote.avatar.userData.parts;
      const blend = 1 - Math.exp(-dt * 13);
      remote.avatar.position.x += (remote.target.x - remote.avatar.position.x) * blend;
      remote.avatar.position.z += (remote.target.z - remote.avatar.position.z) * blend;
      const yawDelta = Math.atan2(Math.sin(remote.target.yaw - remote.avatar.rotation.y), Math.cos(remote.target.yaw - remote.avatar.rotation.y));
      remote.avatar.rotation.y += yawDelta * blend;
      const bob = Math.sin(this.clock * 5 + remote.avatar.position.x) * 0.025;
      remote.avatar.position.y = bob;
      remoteParts.leftLeg.rotation.x = Math.sin(this.clock * 6 + remote.avatar.position.z) * 0.12;
      remoteParts.rightLeg.rotation.x = -remoteParts.leftLeg.rotation.x;
    }
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  updateCamera(dt) {
    const eye = this.player.clone().add(new THREE.Vector3(0, 1.63, 0));
    const forward = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    let desired = eye.clone();
    if (this.cameraMode === 1) desired = eye.clone().addScaledVector(forward, -5.1).add(new THREE.Vector3(0, 1.05, 0));
    if (this.cameraMode === 2) desired = eye.clone().addScaledVector(forward, 4.8).add(new THREE.Vector3(0, 0.35, 0));
    if (this.cameraMode === 0) {
      this.camera.position.copy(eye);
    } else {
      const rayDirection = desired.clone().sub(eye).normalize();
      const distance = eye.distanceTo(desired);
      const ray = new THREE.Raycaster(eye, rayDirection, 0.1, distance);
      const hits = ray.intersectObjects(this.cameraBlockers, false);
      if (hits.length) desired = eye.clone().addScaledVector(rayDirection, Math.max(0.65, hits[0].distance - 0.55));
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 10));
    }
    const target = this.cameraMode === 2 ? eye.clone().addScaledVector(forward, -7) : eye.clone().addScaledVector(forward, 12);
    this.camera.lookAt(target);
  }

  reset() {
    this.player.set(0, 0, 13);
    this.velocityY = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.grounded = true;
    this.health = 100;
    this.score = 0;
    this.ammo = CONFIG.magazineSize;
    this.reserve = CONFIG.reserveAmmo;
    this.cooldown = 0;
    this.reloadTime = 0;
    this.cameraMode = 0;
    this.clock = 0;
    this.lastShot = null;
    this.lastShotSequence = 0;
    this.playerVisual.position.copy(this.player);
    this.playerVisual.rotation.set(0, 0, 0);
    this.playerVisual.visible = false;
    for (const target of this.targets) {
      target.userData.hit = 0;
      target.visible = true;
      target.position.set(target.userData.originX, 0, target.userData.originZ);
      target.rotation.set(0, 0, 0);
    }
    for (const projectile of this.projectiles) {
      this.scene.remove(projectile.mesh);
      projectile.mesh.geometry.dispose();
      projectile.mesh.material.dispose();
    }
    this.projectiles.length = 0;
    this.camera.position.set(0, 1.63, 13);
    this.onHud({ health: 100, score: 0, ammo: "12 / 60" });
  }

  dispose() {
    window.removeEventListener("resize", this._resize);
    this.renderer.dispose();
  }
}
