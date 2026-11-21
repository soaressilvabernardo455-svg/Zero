import { Game } from "./game.js";
import { InputController } from "./input.js";

const canvas=document.getElementById("game-canvas");
const menu=document.getElementById("menu");
const hud=document.getElementById("hud");
const pause=document.getElementById("pause-message");
const toast=document.getElementById("toast");
const sensitivity=document.getElementById("sensitivity");
const sensitivityValue=document.getElementById("sensitivity-value");
const game=new Game(canvas, updateHud);
const input=new InputController(canvas,Number(sensitivity.value));
let active=false,paused=false,lastTime=0;

function updateHud(data){
  if(data.health!==undefined) document.getElementById("health").textContent=data.health;
  if(data.score!==undefined) document.getElementById("score").textContent=data.score;
  if(data.ammo!==undefined) document.getElementById("ammo").textContent=data.ammo;
}
function showToast(message){
  toast.textContent=message;toast.classList.add("show");
  window.setTimeout(()=>toast.classList.remove("show"),1300);
}
function loop(time){
  if(!active||paused)return;
  const dt=Math.min((time-lastTime)/1000||0,.04);lastTime=time;
  game.update(dt,input.consume());
  requestAnimationFrame(loop);
}
function start(){
  active=true;paused=false;menu.classList.add("hidden");pause.classList.add("hidden");hud.classList.remove("hidden");
  game.start();lastTime=performance.now();requestAnimationFrame(loop);
  if(matchMedia("(pointer:fine)").matches) canvas.requestPointerLock?.();
}
function stop(){
  active=false;paused=false;game.stop();hud.classList.add("hidden");pause.classList.add("hidden");menu.classList.remove("hidden");
  if(document.pointerLockElement)document.exitPointerLock();
}
document.getElementById("start-button").addEventListener("click",start);
document.getElementById("exit-button").addEventListener("click",stop);
document.getElementById("resume-button").addEventListener("click",()=>{paused=false;pause.classList.add("hidden");lastTime=performance.now();requestAnimationFrame(loop);});
document.getElementById("camera-button").addEventListener("click",()=>{input.cameraPressed=true;});
document.getElementById("reload-button").addEventListener("click",()=>{input.reloadPressed=true;});
sensitivity.addEventListener("input",()=>{input.setSensitivity(sensitivity.value);sensitivityValue.textContent=Number(sensitivity.value).toFixed(1)+"x";});
document.getElementById("quality").addEventListener("change",e=>game.setQuality(e.target.value));
window.addEventListener("keydown",e=>{
  if(e.code==="Escape"&&active){paused=!paused;pause.classList.toggle("hidden",!paused);if(!paused){lastTime=performance.now();requestAnimationFrame(loop);}else if(document.pointerLockElement)document.exitPointerLock();}
});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&active&&!paused){paused=true;pause.classList.remove("hidden");}});
window.addEventListener("contextmenu",e=>e.preventDefault());
window.addEventListener("error",e=>showToast("Erro de interface: "+(e.message||"verifique o console")));
updateHud({health:100,score:0,ammo:"12 / 60"});