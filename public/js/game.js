import * as THREE from "three";
import { CONFIG, clamp, normalize2 } from "./config.js";

export class Game {
  constructor(canvas, onHud) {
    this.canvas = canvas;
    this.onHud = onHud;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x91b9d2);
    this.scene.fog = new THREE.Fog(0x91b9d2, 38, 115);
    this.camera = new THREE.PerspectiveCamera(76, 1, 0.1, 180);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.player = new THREE.Vector3(0, 0, 12);
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
    this.targets = [];
    this.projectiles = [];
    this.colliders = [];
    this.createWorld();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  createWorld() {
    this.scene.add(new THREE.HemisphereLight(0xd8efff, 0x4b5946, 2.0));
    const sun = new THREE.DirectionalLight(0xffedcf, 2.4);
    sun.position.set(-24, 38, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -55; sun.shadow.camera.right = 55;
    sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55;
    this.scene.add(sun);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x596b57, roughness: 1 }));
    ground.rotation.x = -Math.PI/2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const grid = new THREE.GridHelper(100, 50, 0x8aa08a, 0x718571);
    grid.position.y = 0.012;
    this.scene.add(grid);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x657584, roughness: .9 });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x9a7958, roughness: .8 });
    const addBox = (x,y,z,w,h,d,mat=wallMat) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
      mesh.position.set(x,y+h/2,z);
      mesh.castShadow = true; mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.colliders.push({x,z,halfX:w/2,halfZ:d/2});
    };
    addBox(-13,0,-8,12,6,2); addBox(13,0,-8,12,6,2);
    addBox(-24,0,12,2,4,18); addBox(24,0,12,2,4,18);
    addBox(0,0,-28,22,5,2);
    addBox(-8,0,4,3,1.5,3,boxMat); addBox(8,0,-1,3,1.5,3,boxMat);
    addBox(0,0,19,5,1.2,3,boxMat);

    for (let i=0;i<18;i++) {
      const x = (Math.random()-.5)*82, z = (Math.random()-.5)*82;
      if (Math.abs(x)<28 && Math.abs(z)<28) continue;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18,.28,2.4,7), new THREE.MeshStandardMaterial({color:0x60442d}));
      trunk.position.set(x,1.2,z); trunk.castShadow=true; this.scene.add(trunk);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(1.35,8,7), new THREE.MeshStandardMaterial({color:0x356b48,roughness:1}));
      crown.position.set(x,3,z); crown.castShadow=true; this.scene.add(crown);
      this.colliders.push({x,z,halfX:.42,halfZ:.42});
    }

    this.playerVisual = new THREE.Group();
    const suit = new THREE.MeshStandardMaterial({color:0x243b55,roughness:.8});
    const accent = new THREE.MeshStandardMaterial({color:0x39b8e8,emissive:0x082b3c});
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.38,.65,4,8),suit);
    torso.position.y=1.05; torso.castShadow=true; this.playerVisual.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.23,12,10),new THREE.MeshStandardMaterial({color:0xd1a987}));
    head.position.y=1.72; head.castShadow=true; this.playerVisual.add(head);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(.32,.1,.08),accent);
    visor.position.set(0,1.76,-.2); this.playerVisual.add(visor);
    this.scene.add(this.playerVisual);

    const targetMat = new THREE.MeshStandardMaterial({color:0xe85c4d, emissive:0x48100b, roughness:.45});
    for(let i=0;i<CONFIG.targetCount;i++) {
      const target = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(.55,.7,4,8), targetMat.clone());
      body.position.y=1.05; body.castShadow=true; target.add(body);
      const marker = new THREE.Mesh(new THREE.TorusGeometry(.78,.07,6,18), new THREE.MeshBasicMaterial({color:0xffd16a}));
      marker.position.y=1.05; target.add(marker);
      target.position.set((i%4-1.5)*8,0,-8-Math.floor(i/4)*12);
      target.userData = { originX: target.position.x, phase: Math.random()*6.28, hit: 0 };
      this.scene.add(target); this.targets.push(target);
    }
  }

  resize() {
    const w = Math.max(1, this.canvas.clientWidth), h = Math.max(1, this.canvas.clientHeight);
    this.camera.aspect = w/h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w,h,false);
  }

  setQuality(level) {
    const ratio = level === "low" ? 1 : level === "high" ? Math.min(devicePixelRatio||1,1.8) : Math.min(devicePixelRatio||1,1.35);
    this.renderer.setPixelRatio(ratio);
    this.renderer.shadowMap.enabled = level !== "low";
    this.renderer.setSize(this.canvas.clientWidth,this.canvas.clientHeight,false);
  }

  start() {}
  stop() {}

  fire() {
    if (this.cooldown>0 || this.reloadTime>0) return;
    if (this.ammo<=0) { this.reload(); return; }
    this.ammo--; this.cooldown=CONFIG.fireCooldown;
    const direction = new THREE.Vector3(-Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch)).normalize();
    const origin = this.cameraMode===0
      ? this.camera.position.clone()
      : this.player.clone().add(new THREE.Vector3(0,1.45,0));
    const bolt = new THREE.Mesh(new THREE.SphereGeometry(.11,8,8), new THREE.MeshBasicMaterial({color:0x66dcff}));
    bolt.position.copy(origin); this.scene.add(bolt);
    this.projectiles.push({mesh:bolt,velocity:direction.multiplyScalar(CONFIG.projectileSpeed),life:1.8});
    this.onHud({ammo:this.ammo+" / "+this.reserve});
  }

  reload() {
    if(this.reloadTime>0 || this.ammo===CONFIG.magazineSize || this.reserve<=0) return;
    this.reloadTime=1.25;
  }

  hitTarget(projectile, stepLength) {
    const direction=projectile.velocity.clone().normalize();
    const ray = new THREE.Raycaster(projectile.previous,direction,0,stepLength+.35);
    for(const target of this.targets) {
      if(target.userData.hit>0 || !target.visible) continue;
      const meshes=[];
      target.traverse(o=>{if(o.isMesh)meshes.push(o);});
      if(ray.intersectObjects(meshes,false).length) {
        target.userData.hit=1.1;
        this.score++;
        this.onHud({score:this.score});
        return true;
      }
    }
    return false;
  }

  moveWithCollision(dx,dz) {
    const radius=.48;
    const nextX=clamp(this.player.x+dx,-48,48);
    if(!this.colliders.some(c=>Math.abs(nextX-c.x)<c.halfX+radius && Math.abs(this.player.z-c.z)<c.halfZ+radius)) this.player.x=nextX;
    const nextZ=clamp(this.player.z+dz,-48,48);
    if(!this.colliders.some(c=>Math.abs(this.player.x-c.x)<c.halfX+radius && Math.abs(nextZ-c.z)<c.halfZ+radius)) this.player.z=nextZ;
  }

  update(dt, input) {
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(input.reload) this.reload();
    if(input.camera) this.cameraMode=(this.cameraMode+1)%3;
    if(input.fire) this.fire();
    this.yaw-=input.lookX;
    this.pitch=clamp(this.pitch-input.lookY,-1.25,1.25);

    const move=normalize2(input.moveX,input.moveY);
    const forward=new THREE.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw));
    const right=new THREE.Vector3(Math.cos(this.yaw),0,-Math.sin(this.yaw));
    const speed=CONFIG.playerSpeed*(input.sprint?CONFIG.sprintMultiplier:1);
    const delta=new THREE.Vector3().addScaledVector(forward,move.y*speed*dt).addScaledVector(right,move.x*speed*dt);
    this.moveWithCollision(delta.x,delta.z);

    if(input.jump && this.grounded) {this.velocityY=CONFIG.jumpVelocity;this.grounded=false;}
    this.velocityY-=CONFIG.gravity*dt;
    this.player.y+=this.velocityY*dt;
    if(this.player.y<0){this.player.y=0;this.velocityY=0;this.grounded=true;}

    this.playerVisual.position.copy(this.player);
    this.playerVisual.rotation.y=this.yaw;
    this.playerVisual.visible=this.cameraMode!==0;

    for(const target of this.targets) {
      target.userData.phase+=dt;
      target.position.x=target.userData.originX+Math.sin(target.userData.phase)*1.5;
      target.userData.hit=Math.max(0,target.userData.hit-dt);
      target.visible=target.userData.hit<=0;
    }
    for(let i=this.projectiles.length-1;i>=0;i--) {
      const p=this.projectiles[i];
      p.previous=p.mesh.position.clone();
      const stepLength=p.velocity.length()*dt;
      p.mesh.position.addScaledVector(p.velocity,dt); p.life-=dt;
      const hit=this.hitTarget(p,stepLength);
      if(hit||p.life<=0){this.scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();this.projectiles.splice(i,1);}
    }
    if(this.reloadTime>0) {
      this.reloadTime-=dt;
      if(this.reloadTime<=0) {
        const amount=Math.min(CONFIG.magazineSize-this.ammo,this.reserve);
        this.ammo+=amount;this.reserve-=amount;
        this.onHud({ammo:this.ammo+" / "+this.reserve});
      }
    }
    this.updateCamera(dt);
    this.renderer.render(this.scene,this.camera);
  }

  updateCamera(dt) {
    const eye=this.player.clone().add(new THREE.Vector3(0,1.65,0));
    const forward=new THREE.Vector3(-Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch));
    let desired=eye.clone();
    if(this.cameraMode===1) desired=eye.clone().addScaledVector(forward,-5).add(new THREE.Vector3(0,1.1,0));
    if(this.cameraMode===2) desired=eye.clone().addScaledVector(forward,4);
    this.camera.position.lerp(desired,1-Math.exp(-dt*12));
    const lookAt=this.cameraMode===2?eye.clone().addScaledVector(forward,-8):eye.clone().addScaledVector(forward,12);
    this.camera.lookAt(lookAt);
  }
}