import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG, clamp, normalize2 } from "../public/js/config.js";

test("configuração principal possui valores válidos",()=>{
  assert.equal(CONFIG.magazineSize,12);
  assert.ok(CONFIG.playerSpeed>0);
  assert.equal(CONFIG.cameraModes.length,3);
});
test("clamp limita valores",()=>{
  assert.equal(clamp(5,0,3),3);
  assert.equal(clamp(-2,0,3),0);
  assert.equal(clamp(2,0,3),2);
});
test("normalize2 gera vetor unitário e trata vetor nulo",()=>{
  const v=normalize2(3,4);
  assert.ok(Math.abs(Math.hypot(v.x,v.y)-1)<1e-10);
  assert.deepEqual(normalize2(0,0),{x:0,y:0});
});