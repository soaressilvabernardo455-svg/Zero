import * as THREE from "three";
import { CONFIG, clamp, normalize2 } from "./config.js";

function makeFloorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#63854a";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 7200; i++) {
    const green = 72 + Math.floor(Math.random() * 62);
    const red = 38 + Math.floor(Math.random() * 32);
    const blue = 30 + Math.floor(Math.random() * 22);
    ctx.fillStyle = "rgba(" + red + "," + green + "," + blue + ",0.22)";
    const size = 1 + Math.random() * 3;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, size, size);
  }
  for (let i = 0; i < 34; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const radius = 10 + Math.random() * 28;
    const patch = ctx.createRadialGradient(x, y, 0, x, y, radius);
    patch.addColorStop(0, "rgba(142,150,75,.22)");
    patch.addColorStop(1, "rgba(142,150,75,0)");
    ctx.fillStyle = patch;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
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
    this.scene.fog = new THREE.Fog(0x9bb8a0, 95, 300);
    this.camera = new THREE.PerspectiveCamera(74, 1, 0.1, 380);
    const mobile = navigator.maxTouchPoints > 0 || matchMedia("(pointer:coarse)").matches || window.innerWidth < 1000;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !mobile,
      powerPreference: "high-performance",
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.0 : 1.6));
    this.renderer.shadowMap.enabled = !mobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    this.spawnPoint = new THREE.Vector3(0, 0, 81);
    this.player = this.spawnPoint.clone();
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
    this.hemiLight = new THREE.HemisphereLight(0xccecff, 0x30432b, 1.35);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffe1b2, 2.05);
    this.sunLight.position.set(-35, 70, 35);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.left = -125;
    this.sunLight.shadow.camera.right = 125;
    this.sunLight.shadow.camera.top = 125;
    this.sunLight.shadow.camera.bottom = -125;
    this.sunLight.shadow.bias = -0.00025;
    this.scene.add(this.sunLight);

    const fill = new THREE.DirectionalLight(0x7ab8ff, 0.28);
    fill.position.set(70, 25, -65);
    this.scene.add(fill);

    const groundTexture = makeFloorTexture();
    groundTexture.repeat.set(12, 12);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(224, 224),
      new THREE.MeshStandardMaterial({ map: groundTexture, color: 0xc0d1a2, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const roadMat = new THREE.MeshStandardMaterial({ color: 0x343d43, roughness: 0.96 });
    const roadLine = new THREE.MeshBasicMaterial({ color: 0xd8c99b, transparent: true, opacity: 0.62 });
    const addRoad = (x, z, width, depth, horizontal) => {
      const road = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, depth), roadMat);
      road.position.set(x, -0.015, z);
      road.receiveShadow = true;
      this.scene.add(road);
      const dashLength = 2.4;
      if (horizontal) {
        for (let p = x - width / 2 + 5; p < x + width / 2 - 3; p += 9) {
          const dash = new THREE.Mesh(new THREE.BoxGeometry(dashLength, 0.025, 0.12), roadLine);
          dash.position.set(p, 0.04, z); this.scene.add(dash);
        }
      } else {
        for (let p = z - depth / 2 + 5; p < z + depth / 2 - 3; p += 9) {
          const dash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, dashLength), roadLine);
          dash.position.set(x, 0.04, p); this.scene.add(dash);
        }
      }
    };
    addRoad(0, 0, 224, 9, true);
    addRoad(0, 0, 9, 224, false);
    addRoad(-52, -52, 88, 6, true);
    addRoad(57, -54, 94, 6, true);
    addRoad(-59, 61, 88, 6, true);
    addRoad(58, 62, 96, 6, true);
    addRoad(-53, -52, 6, 76, false);
    addRoad(58, -54, 6, 76, false);
    addRoad(-59, 61, 6, 76, false);
    addRoad(58, 62, 6, 76, false);

    const wallColors = [0xc9b99b, 0xd6c7a9, 0xa9b8b4, 0xd8b18e, 0xb7c7d1];
    const roofColors = [0x713e32, 0x42546a, 0x8a5540, 0x59664c];
    const roofMaterial = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
    const makeRoofPanel = (x, y, z, width, depth, color, angle) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(width, 0.42, depth), roofMaterial(color));
      panel.position.set(x, y, z);
      panel.rotation.z = angle;
      panel.castShadow = true;
      panel.receiveShadow = true;
      this.scene.add(panel);
      this.cameraBlockers.push(panel);
      return panel;
    };

    const placeHouse = (x, z, width, depth, height, color, roofColor, rotation = 0) => {
      const wall = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
      const frontZ = z - Math.cos(rotation) * depth / 2;
      this.addBox(x, 0, z, width, height, depth, wall, true);
      makeRoofPanel(x - width * 0.24, height + 0.52, z, width * 0.58, depth + 0.8, roofColor, 0.42);
      makeRoofPanel(x + width * 0.24, height + 0.52, z, width * 0.58, depth + 0.8, roofColor, -0.42);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x49352b, roughness: 0.9 });
      const windowMat = new THREE.MeshStandardMaterial({ color: 0x8ed5e8, emissive: 0x234b58, emissiveIntensity: 0.28, metalness: 0.2 });
      const front = z - depth / 2 - 0.055;
      this.addBox(x, 0, front, 1.35, 2.15, 0.12, doorMat, false);
      for (const side of [-1, 1]) {
        this.addBox(x + side * width * 0.29, height * 0.57, front - 0.01, 1.25, 1.05, 0.12, windowMat, false);
        this.addBox(x + side * width * 0.29, height * 0.57, front - 0.085, 0.08, 1.18, 0.08, doorMat, false);
      }
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 1.0), new THREE.MeshStandardMaterial({ color: 0x9a9a84 }));
      step.position.set(x, 0.08, front - 0.55); this.scene.add(step);
      return { x, z, width, depth, frontZ };
    };

    // Vila do Norte: ruas curtas e casas coloridas.
    const houses = [
      [-69, -61, 10, 9, 4.3, wallColors[0], roofColors[0]],
      [-38, -66, 9, 8, 4.0, wallColors[1], roofColors[1]],
      [-68, -35, 8, 8, 3.8, wallColors[3], roofColors[2]],
      [-39, -37, 11, 9, 4.4, wallColors[2], roofColors[0]],
      [45, -68, 10, 9, 4.2, wallColors[4], roofColors[1]],
      [76, -69, 9, 8, 3.8, wallColors[0], roofColors[2]],
      [45, -38, 8, 8, 3.8, wallColors[3], roofColors[3]],
      [77, -39, 11, 9, 4.5, wallColors[1], roofColors[0]],
      [42, 51, 10, 9, 4.0, wallColors[2], roofColors[2]],
      [76, 77, 9, 8, 3.8, wallColors[0], roofColors[1]],
      [44, 82, 11, 9, 4.3, wallColors[4], roofColors[0]]
    ];
    houses.forEach((house) => placeHouse(...house));

    // Mansão do Sul: dois andares, alas laterais e entrada com colunas.
    const mansionX = -68, mansionZ = 78;
    const mansionWall = new THREE.MeshStandardMaterial({ color: 0xd7d0b9, roughness: 0.78 });
    const mansionRoof = roofMaterial(0x493849);
    this.addBox(mansionX, 0, mansionZ, 22, 7.2, 16, mansionWall, true);
    this.addBox(mansionX, 7.2, mansionZ + 1.1, 15, 4.5, 11.5, mansionWall, true);
    const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(10.2, 3.4, 4), mansionRoof);
    upperRoof.rotation.y = Math.PI / 4;
    upperRoof.position.set(mansionX, 13.0, mansionZ + 1.1);
    upperRoof.castShadow = true; this.scene.add(upperRoof); this.cameraBlockers.push(upperRoof);
    this.addBox(mansionX - 10.4, 0, mansionZ - 1, 3.2, 9.3, 3.2, mansionWall, true);
    this.addBox(mansionX + 10.4, 0, mansionZ - 1, 3.2, 9.3, 3.2, mansionWall, true);
    for (const side of [-1, 1]) {
      const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 3.0, 8), mansionRoof);
      towerRoof.position.set(mansionX + side * 10.4, 10.8, mansionZ - 1);
      towerRoof.castShadow = true; this.scene.add(towerRoof);
      for (const floorY of [2.6, 5.2, 8.0]) {
        this.addBox(mansionX + side * 10.4, floorY, mansionZ - 2.68, 1.0, 1.15, 0.12,
          new THREE.MeshStandardMaterial({ color: 0x9ed9e7, emissive: 0x193f4a, emissiveIntensity: 0.25 }), false);
      }
    }
    const mansionDoor = new THREE.MeshStandardMaterial({ color: 0x543b30 });
    const mansionGlass = new THREE.MeshStandardMaterial({ color: 0x9ed9e7, emissive: 0x1d3e48, emissiveIntensity: 0.22, metalness: 0.18 });
    this.addBox(mansionX, 0, mansionZ - 8.12, 2.4, 3.1, 0.16, mansionDoor, false);
    for (const side of [-1, 1]) {
      this.addBox(mansionX + side * 6.2, 2.65, mansionZ - 8.12, 1.8, 1.45, 0.14, mansionGlass, false);
      this.addBox(mansionX + side * 4.25, 8.2, mansionZ - 4.72, 1.7, 1.35, 0.14, mansionGlass, false);
    }
    const columnMat = new THREE.MeshStandardMaterial({ color: 0xe9e0c9 });
    for (const side of [-1, 1]) {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 4.2, 10), columnMat);
      column.position.set(mansionX + side * 3.2, 2.1, mansionZ - 10.2); column.castShadow = true; this.scene.add(column);
      this.colliders.push({ x: mansionX + side * 3.2, z: mansionZ - 10.2, halfX: 0.55, halfZ: 0.55 });
    }
    const balcony = this.addBox(mansionX, 7.35, mansionZ - 5.4, 12, 0.35, 1.0, columnMat, false);

    // Cercas baixas para marcar o terreno da mansão sem fechar a passagem.
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x5c554b });
    for (let p = -16; p <= 16; p += 4) {
      this.addBox(mansionX + p, 0, mansionZ + 13, 0.16, 1.1, 0.16, fenceMat, true);
      if (p < -10 || p > 10) this.addBox(mansionX + p, 0.48, mansionZ + 13, 3.8, 0.16, 0.16, fenceMat, false);
    }

    // Árvores instanciadas: muitas copas com poucos draw calls para preservar FPS no celular.
    const trunkGeometry = new THREE.CylinderGeometry(0.22, 0.32, 2.8, 7);
    const leafGeometry = new THREE.ConeGeometry(1.75, 4.4, 7);
    const leafTopGeometry = new THREE.ConeGeometry(1.25, 3.4, 7);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x62452d, roughness: 1 });
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x356f42, roughness: 1 });
    const leafTopMaterial = new THREE.MeshStandardMaterial({ color: 0x4f8e4a, roughness: 1 });
    const treeCount = 126;
    const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeCount);
    const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, treeCount);
    const leafTops = new THREE.InstancedMesh(leafTopGeometry, leafTopMaterial, treeCount);
    const dummy = new THREE.Object3D();
    let seed = 7919;
    const random = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
    const clearZones = [
      [-68, -61, 20, 17], [-38, -66, 17, 16], [-68, -35, 15, 15], [-39, -37, 18, 16],
      [45, -68, 18, 18], [76, -69, 16, 15], [45, -38, 15, 15], [77, -39, 18, 17],
      [-68, 78, 30, 28], [42, 51, 18, 17], [76, 77, 18, 17], [44, 82, 19, 18],
      [0, 0, 17, 17], [0, 81, 18, 17]
    ];
    let placed = 0, attempts = 0;
    while (placed < treeCount && attempts < 1600) {
      attempts++;
      const x = -103 + random() * 206;
      const z = -103 + random() * 206;
      if (Math.abs(x) < 7 || Math.abs(z) < 7) continue;
      if (clearZones.some(([cx, cz, rx, rz]) => Math.abs(x - cx) < rx && Math.abs(z - cz) < rz)) continue;
      if (Math.abs(x) < 11 && Math.abs(z - 81) < 12) continue;
      const scale = 0.72 + random() * 0.62;
      const rotation = random() * Math.PI * 2;
      dummy.position.set(x, 1.35 * scale, z);
      dummy.rotation.set(0, rotation, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix(); trunks.setMatrixAt(placed, dummy.matrix);
      dummy.position.set(x, 3.25 * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix(); leaves.setMatrixAt(placed, dummy.matrix);
      dummy.position.set(x, 4.45 * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix(); leafTops.setMatrixAt(placed, dummy.matrix);
      this.colliders.push({ x, z, halfX: 0.62 * scale, halfZ: 0.62 * scale });
      placed++;
    }
    trunks.count = leaves.count = leafTops.count = placed;
    trunks.castShadow = leaves.castShadow = leafTops.castShadow = true;
    this.scene.add(trunks, leaves, leafTops);

    // Rochas e arbustos decorativos nos limites das trilhas.
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x777b70, roughness: 1 });
    for (let i = 0; i < 24; i++) {
      const x = -100 + random() * 200, z = -100 + random() * 200;
      if (Math.abs(x) < 17 || Math.abs(z) < 17) continue;
      if (clearZones.some(([cx, cz, rx, rz]) => Math.abs(x - cx) < rx && Math.abs(z - cz) < rz)) continue;
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      const scale = 0.5 + random() * 1.0;
      rock.scale.set(scale, scale * 0.65, scale);
      rock.position.set(x, scale * 0.35, z);
      rock.rotation.set(random(), random() * 3, random());
      rock.castShadow = true; this.scene.add(rock);
      this.colliders.push({ x, z, halfX: scale * 0.8, halfZ: scale * 0.8 });
    }

    // Zona inicial aberta, com marco de entrada e luzes de referência.
    const spawnRing = new THREE.Mesh(new THREE.TorusGeometry(5, 0.12, 8, 48), makeGlow(0x39d6ff, 0.8));
    spawnRing.rotation.x = Math.PI / 2; spawnRing.position.set(0, 0.12, 81); this.scene.add(spawnRing);
    const spawnPad = new THREE.Mesh(new THREE.CircleGeometry(4.5, 40), new THREE.MeshStandardMaterial({ color: 0x54734a, roughness: 1 }));
    spawnPad.rotation.x = -Math.PI / 2; spawnPad.position.set(0, 0.005, 81); this.scene.add(spawnPad);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x48565a, metalness: 0.25 });
    for (const [x, z] of [[-100, -96], [100, -96], [-100, 96], [100, 96], [-82, 0], [82, 0]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 7, 8), poleMat);
      pole.position.set(x, 3.5, z); this.scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 8), makeGlow(0xffd28b, 1.1));
      lamp.position.set(x, 7, z); this.scene.add(lamp);
      this.colliders.push({ x, z, halfX: 0.5, halfZ: 0.5 });
    }

    this.targetMaterial = new THREE.MeshStandardMaterial({ color: 0xf06b48, metalness: 0.35, roughness: 0.5 });
    const targetSpots = [
      [-91, -87], [-35, -86], [28, -90], [91, -82],
      [-93, 5], [92, 12], [-33, 44], [21, 34], [73, 86], [-12, -24]
    ];
    targetSpots.slice(0, CONFIG.targetCount).forEach((spot, index) => this.createTarget(spot[0], spot[1], index));

    this.camera.position.set(this.spawnPoint.x, 1.65, this.spawnPoint.z);
    this.dayPhase = this.dayPhase ?? 0.25;
    this.skyPalette = { day: new THREE.Color(0x91c8ed), sunset: new THREE.Color(0xe18d69), night: new THREE.Color(0x101b32), current: new THREE.Color() };
    this._lastWorldTime = "";
    this.updateDayNight(0);
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

  updateDayNight(dt) {
    // ZERO stays in daylight permanently; no night transition. Final Android package build.
    this.dayPhase = 0.25;
    const palette = this.skyPalette;
    this.scene.background.set(0x91c8ed);
    this.scene.fog.color.set(0x91c8ed);
    this.hemiLight.intensity = 1.5;
    this.sunLight.intensity = 2.12;
    this.sunLight.position.set(0, 95, 0);
    this.sunLight.color.set(0xffefcf);
    this.renderer.toneMappingExposure = 1.18;
    if (this._lastWorldTime !== "DIA · 12:00") {
      this._lastWorldTime = "DIA · 12:00";
      this.onHud({ worldTime: "DIA · 12:00" });
    }
  }


  resize() {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  renderFrame() {
    this.resize();
    this.updateCamera(0);
    this.renderer.render(this.scene, this.camera);
  }

  setQuality(level) {
    const mobile = navigator.maxTouchPoints > 0 || matchMedia("(pointer:coarse)").matches || window.innerWidth < 1000;
    const ratio = level === "low" ? (mobile ? 0.78 : 0.9) : level === "high" ? Math.min(window.devicePixelRatio || 1, mobile ? 1.15 : 1.8) : Math.min(window.devicePixelRatio || 1, mobile ? 1.0 : 1.5);
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
      const x = Number.isFinite(player.x) ? clamp(player.x, -108, 108) : 0;
      const z = Number.isFinite(player.z) ? clamp(player.z, -108, 108) : 0;
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
    const origin = new THREE.Vector3(clamp(shot.origin.x, -120, 120), clamp(shot.origin.y, 0.2, 8), clamp(shot.origin.z, -120, 120));
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
    const nextX = clamp(this.player.x + dx, -106, 106);
    if (!this.colliders.some((c) => Math.abs(nextX - c.x) < c.halfX + radius && Math.abs(this.player.z - c.z) < c.halfZ + radius)) this.player.x = nextX;
    const nextZ = clamp(this.player.z + dz, -106, 106);
    if (!this.colliders.some((c) => Math.abs(this.player.x - c.x) < c.halfX + radius && Math.abs(nextZ - c.z) < c.halfZ + radius)) this.player.z = nextZ;
  }

  update(dt, input) {
    dt = Math.min(Math.max(dt, 0), 0.04);
    this.clock += dt;
    this.updateDayNight(dt);
    const area = this.player.x < -48 && this.player.z > 45 ? "MANSÃO" :
      this.player.z < -40 && Math.abs(this.player.x) < 60 ? "VILA DO NORTE" :
      this.player.x > 48 ? "BOSQUE LESTE" :
      this.player.x < -48 ? "PEDREIRA" :
      this.player.z > 45 ? "VILA DO SUL" : "CAMPO CENTRAL";
    if (area !== this._lastArea) {
      this._lastArea = area;
      this.onHud({ areaName: area });
    }
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
      if (hit || projectile.life <= 0 || projectile.mesh.position.length() > 500) {
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
    this.player.copy(this.spawnPoint);
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
    this.camera.position.set(this.spawnPoint.x, 1.63, this.spawnPoint.z);
    this.onHud({ health: 100, score: 0, ammo: "12 / 60" });
  }

  dispose() {
    window.removeEventListener("resize", this._resize);
    this.renderer.dispose();
  }
}
