import * as THREE from "three";
/* ARSENAL 3D HD - 20 armas procedurais detalhadas (Three.js r128+, precisa de window.THREE).
   Frente = -Z, cima = +Y.  var a = WEAPONS.create('m4','Ouro');  scene.add(a);
   WEAPONS.fire(a) = recuo + flash;  WEAPONS.update(a,dt) a cada frame;  muzzle = a.getObjectByName('muzzle') */
(function (g) {
var T = THREE, GC = {};
function tex(f, s) { var c = document.createElement('canvas'); c.width = c.height = s || 256; f(c.getContext('2d'), c.width); var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t; }
var brushed = tex(function (x, s) { x.fillStyle = '#888'; x.fillRect(0, 0, s, s); for (var i = 0; i < 1200; i++) { x.fillStyle = 'rgba(' + (i % 2 ? '255,255,255' : '0,0,0') + ',' + Math.random() * .18 + ')'; x.fillRect(0, Math.random() * s, s, 1); } for (i = 0; i < 500; i++) { x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(Math.random() * s, Math.random() * s, 2, 1); } });
var stip = tex(function (x, s) { x.fillStyle = '#808080'; x.fillRect(0, 0, s, s); for (var i = 0; i < 3000; i++) { x.fillStyle = i % 2 ? '#4a4a4a' : '#b4b4b4'; x.beginPath(); x.arc(Math.random() * s, Math.random() * s, 1.5, 0, 6.3); x.fill(); } });
var grain = tex(function (x, s) { for (var y = 0; y < s; y++) { var v = 110 + Math.sin(y * .3 + Math.sin(y * .04) * 5) * 28 + Math.random() * 16; x.fillStyle = 'rgb(' + v + ',' + (v * .66 | 0) + ',' + (v * .4 | 0) + ')'; x.fillRect(0, y, s, 1); } });
var camo = tex(function (x, s) { var c = ['#3b4a2f', '#6b7a4a', '#2a2f22', '#8a7d55']; x.fillStyle = c[0]; x.fillRect(0, 0, s, s); for (var i = 0; i < 70; i++) { x.fillStyle = c[1 + i % 3]; x.beginPath(); x.ellipse(Math.random() * s, Math.random() * s, 10 + Math.random() * 30, 6 + Math.random() * 16, Math.random() * 3, 0, 6.3); x.fill(); } });
var FT = tex(function (x, s) { var q = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); q.addColorStop(0, '#fff'); q.addColorStop(.25, 'rgba(255,220,120,.9)'); q.addColorStop(1, 'rgba(255,120,0,0)'); x.fillStyle = q; x.fillRect(0, 0, s, s); x.strokeStyle = 'rgba(255,230,160,.9)'; x.lineWidth = 6; x.beginPath(); x.moveTo(s / 2, 8); x.lineTo(s / 2, s - 8); x.moveTo(8, s / 2); x.lineTo(s - 8, s / 2); x.stroke(); }, 128);
FT.wrapS = FT.wrapT = T.ClampToEdgeWrapping;
function M(k, c, m, r, o) { o = o || {}; var p = new T.MeshPhysicalMaterial({ color: c, metalness: m, roughness: r, clearcoat: o.cc || 0, clearcoatRoughness: .35, emissive: o.e || 0, emissiveIntensity: o.e ? 1.5 : 1, envMapIntensity: 1.2 }); if (o.b) { p.bumpMap = o.b; p.bumpScale = 1.2; p.roughnessMap = o.b; } if (o.map) p.map = o.map; p.userData = { k: k }; return p; }
var K = { st: M('st', 0x3a3f47, .9, .38, { b: brushed }), gn: M('gn', 0x6b7280, .95, .3, { b: brushed }), dk: M('dk', 0x121418, .5, .55, { b: stip }), pl: M('pl', 0x24272d, .1, .7, { b: stip, cc: .25 }), wd: M('wd', 0xffffff, .05, .55, { map: grain, cc: .5 }), gr: M('gr', 0x4a5a3e, .2, .6, { b: stip, cc: .2 }), tn: M('tn', 0xa08f62, .2, .55, { b: stip, cc: .2 }), au: M('au', 0xd9b43a, 1, .2), rd: M('rd', 0xc0392b, .4, .45, { cc: .6 }), or: M('or', 0xff7a00, .4, .4, { cc: .6 }), ln: M('ln', 0x2a8fb3, .95, .03, { e: 0x0a4a60 }), pu: M('pu', 0x8b5cf6, .3, .2, { e: 0x7c4dff }), fi: M('fi', 0xff6d00, .2, .2, { e: 0xff5500 }), bl: M('bl', 0xe5eaee, 1, .12, { b: brushed }), wh: M('wh', 0xe8ecf0, .6, .25, { cc: .8 }), cy: M('cy', 0x22d3ee, .3, .15, { e: 0x06b6d4 }), rb: M('rb', 0x0d0d0f, 0, .95, { b: stip }), rg: M('rg', 0xff2222, 0, .3, { e: 0xff1111 }) };
function P(G, geo, x, y, z, m, r) { var o = new T.Mesh(geo, m); o.position.set(x, y, z); if (r) o.rotation.set(r[0] || 0, r[1] || 0, r[2] || 0); G.add(o); return o; }
function RB(w, h, d, r) { var k = [w, h, d, r].join(); if (GC[k]) return GC[k]; r = Math.min(r, w / 2.2, h / 2.2, d / 2.2); var x = (w - 2 * r) / 2, y = (h - 2 * r) / 2, s = new T.Shape(); s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); var q = new T.ExtrudeGeometry(s, { depth: Math.max(.0001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 2, curveSegments: 1 }); q.translate(0, 0, -(d - 2 * r) / 2); return GC[k] = q; }
function B(G, w, h, d, x, y, z, m, r, rd) { return P(G, RB(w, h, d, rd == null ? .004 : rd), x, y, z, K[m || 'st'], r); }
function C(G, rb, l, x, y, z, m, rf) { var o = P(G, new T.CylinderGeometry(rb, rf == null ? rb : rf, l, 24), x, y, z, K[m || 'st']); o.rotation.x = Math.PI / 2; return o; } /* eixo Z: rb = raio de tras, rf = raio da frente */
function V(G, rb, h, x, y, z, m, rt) { return P(G, new T.CylinderGeometry(rt == null ? rb : rt, rb, h, 24), x, y, z, K[m || 'st']); }
function Sp(G, r, x, y, z, m) { return P(G, new T.SphereGeometry(r, 16, 12), x, y, z, K[m || 'st']); }
function Cn(G, r, l, x, y, z, m, sx, sg) { var o = P(G, new T.ConeGeometry(r, l, sg || 4), x, y, z, K[m || 'bl']); o.rotation.x = -Math.PI / 2; if (sx) o.scale.x = sx; return o; }
function Rg(G, r, t, x, y, z, m) { return P(G, new T.TorusGeometry(r, t, 8, 28), x, y, z, K[m || 'st']); }
function scr(G, x, y, z) { [-1, 1].forEach(function (s) { P(G, new T.CylinderGeometry(.006, .006, .003, 10), s * x, y, z, K.dk, [0, 0, Math.PI / 2]); }); }
function mz(G, x, y, z) { var o = new T.Object3D(); o.name = 'muzzle'; o.position.set(x, y, z); G.add(o); }
function vents(G, x, y, z0, z1, n, h) { for (var i = 0; i < n; i++) for (var s = -1; s < 2; s += 2) B(G, .004, h, .01, s * x, y, z0 + (z1 - z0) * i / (n - 1 || 1), 'dk', null, .001); }
function ejp(G, x, y, z) { B(G, .004, .028, .07, x, y, z, 'dk', null, .001); B(G, .005, .006, .074, x, y + .017, z, 'bl', null, .001); }
function chg(G, y, z) { B(G, .012, .012, .04, 0, y, z, 'st'); B(G, .036, .01, .016, 0, y, z + .02, 'gn'); }
function rail(G, y, z0, z1, w) { w = w || .032; B(G, w * .8, .008, z0 - z1, 0, y - .006, (z0 + z1) / 2, 'dk'); for (var z = z0; z > z1; z -= .018) B(G, w, .008, .009, 0, y, z, 'st', null, .001); }
function trig(G, y, z) { B(G, .008, .006, .07, 0, y - .04, z, 'st'); B(G, .008, .04, .006, 0, y - .02, z - .035, 'st'); B(G, .008, .04, .006, 0, y - .02, z + .035, 'st'); B(G, .01, .032, .008, 0, y - .012, z, 'gn', [.3, 0, 0]); }
function grip(G, z, m, t) { t = t == null ? .3 : t; B(G, .046, .15, .062, 0, -.1, z, m || 'pl', [t, 0, 0], .01); B(G, .04, .11, .012, 0, -.1, z + .036, m || 'pl', [t, 0, 0]); for (var i = 0; i < 3; i++) B(G, .05, .005, .066, 0, -.06 - i * .03, z, 'dk', [t, 0, 0], .001); }
function mag(G, z, w, h, d, m, t) { t = t || 0; B(G, w, h, d, 0, -.03 - h / 2, z, m || 'dk', [t, 0, 0], .005); for (var i = 0; i < 5; i++) B(G, w + .004, .004, d + .004, 0, -.05 - i * h / 5.4, z, 'st', [t, 0, 0], .001); B(G, w + .008, .012, d + .008, 0, -.03 - h, z, 'gn', [t, 0, 0], .003); }
function supp(G, y, z, l, r) { C(G, r, l, 0, y, z, 'dk'); C(G, r * 1.06, .02, 0, y, z + l / 2, 'st'); C(G, r * 1.06, .02, 0, y, z - l / 2, 'st'); for (var i = 1; i < 5; i++) Rg(G, r + .001, .003, 0, y, z - l / 2 + l * i / 5, 'gn'); C(G, r * .45, .004, 0, y, z - l / 2 - .003, 'rb'); }
function brake(G, y, z, r) { C(G, r, .06, 0, y, z, 'dk', r * .85); for (var i = 0; i < 3; i++) Rg(G, r, .004, 0, y, z - .02 + i * .02, 'st'); C(G, r * .45, .004, 0, y, z - .032, 'rb'); }
function optic(G, y, z, l, r) { C(G, r, l, 0, y, z, 'dk'); C(G, r, l * .25, 0, y, z - l * .38, 'dk', r * 1.45); C(G, r * 1.3, l * .2, 0, y, z + l * .4, 'dk', r); C(G, r * 1.4, .004, 0, y, z - l * .5 - .001, 'ln'); C(G, r * 1.25, .004, 0, y, z + l * .5 + .001, 'ln'); V(G, .011, .022, 0, y + r + .008, z, 'st'); Sp(G, .011, r + .008, y, z, 'st'); [-l / 4, l / 4].forEach(function (o) { B(G, .022, .035, .024, 0, y - r - .012, z + o, 'st'); Rg(G, r + .002, .004, 0, y, z + o, 'gn'); }); B(G, .03, .01, l * .6, 0, y - r - .032, z, 'st'); }
function dot(G, y, z) { B(G, .05, .012, .07, 0, y, z, 'dk'); B(G, .006, .04, .07, -.022, y + .02, z, 'dk'); B(G, .006, .04, .07, .022, y + .02, z, 'dk'); B(G, .04, .034, .003, 0, y + .022, z - .034, 'ln', [-.15, 0, 0]); Sp(G, .003, 0, y + .024, z - .01, 'rg'); }
function stock(G, z, len, h, m) { B(G, .05, h, len, 0, 0, z + len / 2, m || 'pl', [-.08, 0, 0], .012); B(G, .054, h * 1.15, .025, 0, -.005, z + len, 'rb', [-.08, 0, 0], .006); B(G, .046, .03, len * .5, 0, h / 2 + .012, z + len * .3, m || 'pl', [-.08, 0, 0]); }
function fgrip(G, y, z) { B(G, .032, .1, .036, 0, y - .05, z, 'pl'); for (var i = 0; i < 4; i++) B(G, .036, .005, .04, 0, y - .02 - i * .02, z, 'dk', null, .001); B(G, .04, .015, .05, 0, y, z, 'st'); }
function bipod(G, z, h) { [-1, 1].forEach(function (s) { B(G, .01, h, .012, s * (.045 + h * .1), -.06 - h / 2, z, 'st', [0, 0, -s * .35]); B(G, .014, .012, .02, s * (.045 + h * .19), -.06 - h, z, 'rb'); }); }
function laser(G, y, z) { B(G, .026, .026, .07, 0, y, z, 'dk'); C(G, .01, .004, 0, y, z - .037, 'rg'); }
function sight(G, y, zf, zr) { B(G, .014, .016, .014, 0, y + .008, zf, 'dk'); B(G, .004, .022, .004, 0, y + .027, zf, 'dk'); B(G, .006, .02, .01, -.012, y + .012, zr, 'dk'); B(G, .006, .02, .01, .012, y + .012, zr, 'dk'); }

var W = {
p9: function (G) {
  B(G, .05, .056, .27, 0, .04, -.02, 'gn', null, .008); B(G, .044, .035, .22, 0, 0, 0, 'pl');
  vents(G, .0255, .04, .035, .11, 6, .04); vents(G, .0255, .04, -.15, -.11, 3, .04); ejp(G, .0255, .05, -.04);
  C(G, .013, .06, 0, .04, -.185, 'dk'); C(G, .008, .004, 0, .04, -.216, 'rb'); sight(G, .068, -.13, .12);
  B(G, .01, .014, .018, 0, .066, .125, 'st'); grip(G, .07, 'pl', .22); trig(G, 0, 0);
  B(G, .04, .012, .07, 0, -.18, .085, 'gn', [.22, 0, 0]); B(G, .03, .01, .07, 0, -.02, -.09, 'st');
  for (var i = 0; i < 3; i++) B(G, .032, .008, .008, 0, -.012, -.065 - i * .02, 'dk');
  B(G, .004, .01, .04, .027, .015, -.03, 'st'); scr(G, .024, .03, .06); mz(G, 0, .04, -.22);
},
magnum: function (G) {
  C(G, .02, .32, 0, .05, -.2, 'gn', .018); B(G, .028, .014, .3, 0, .073, -.2, 'st');
  for (var i = 0; i < 6; i++) B(G, .026, .003, .006, 0, .081, -.1 - i * .045, 'dk', null, .001);
  C(G, .016, .16, 0, .012, -.26, 'st'); C(G, .048, .085, 0, .03, -.01, 'st');
  for (var j = 0; j < 6; j++) { var a = j * Math.PI / 3; C(G, .011, .088, Math.cos(a) * .03, .03 + Math.sin(a) * .03, -.01, 'dk'); }
  Rg(G, .049, .004, 0, .03, .035, 'gn'); B(G, .045, .07, .12, 0, .02, .07, 'gn', null, .008); B(G, .014, .03, .03, 0, .075, .12, 'st', [.5, 0, 0]);
  B(G, .04, .15, .07, 0, -.08, .14, 'wd', [.35, 0, 0], .012); trig(G, .01, .03); C(G, .02, .012, 0, .05, -.36, 'au');
  B(G, .008, .02, .01, 0, .092, -.35, 'rd'); B(G, .02, .018, .014, 0, .088, .04, 'dk'); scr(G, .0235, .03, .07); mz(G, 0, .05, -.37);
},
vespa: function (G) {
  B(G, .06, .09, .3, 0, .02, 0, 'pl', null, .008); B(G, .062, .03, .3, 0, .075, 0, 'gn'); rail(G, .092, .13, -.1);
  vents(G, .0305, .02, -.12, .1, 8, .03); ejp(G, .0315, .05, .02); chg(G, .1, .15);
  supp(G, .035, -.25, .2, .028); C(G, .012, .05, 0, .035, -.17, 'st'); mag(G, -.02, .035, .22, .05, 'dk'); grip(G, .1, 'pl', .25); trig(G, 0, .04);
  B(G, .008, .008, .2, -.02, .02, .25, 'st'); B(G, .008, .008, .2, .02, .02, .25, 'st'); B(G, .05, .07, .012, 0, -.01, .35, 'rb');
  dot(G, .1, -.02); fgrip(G, -.03, -.12); laser(G, .015, -.18); scr(G, .0315, 0, -.08); mz(G, 0, .035, -.35);
},
rajada: function (G) {
  B(G, .052, .075, .2, 0, .02, 0, 'gr', null, .008); B(G, .054, .02, .2, 0, .065, 0, 'st'); vents(G, .0265, .02, -.07, .07, 5, .03);
  C(G, .013, .09, 0, .035, -.145, 'dk'); C(G, .02, .05, 0, .035, -.2, 'or', .016); Rg(G, .02, .004, 0, .035, -.18, 'dk');
  mag(G, .02, .034, .26, .05, 'dk'); grip(G, .05, 'gr', .25); trig(G, 0, 0); fgrip(G, -.03, -.1);
  sight(G, .085, -.06, .08); ejp(G, .0275, .045, -.01); chg(G, .08, .08); laser(G, .0, -.12); scr(G, .0265, .0, .06); mz(G, 0, .035, -.225);
},
ar47: function (G) {
  B(G, .06, .085, .36, 0, .02, 0, 'gn', null, .006); B(G, .066, .026, .3, 0, .077, .02, 'st'); ejp(G, .0305, .035, -.02); chg(G, .04, .04);
  B(G, .07, .06, .22, 0, .025, -.28, 'wd', null, .01); B(G, .056, .03, .2, 0, .07, -.28, 'wd'); vents(G, .0355, .03, -.37, -.19, 5, .012);
  C(G, .012, .3, 0, .05, -.55, 'dk'); C(G, .011, .26, 0, .093, -.36, 'st'); Rg(G, .013, .004, 0, .093, -.3, 'gn'); Rg(G, .013, .004, 0, .093, -.45, 'gn');
  C(G, .02, .05, 0, .05, -.68, 'gn', .016); B(G, .01, .04, .01, 0, .075, -.66, 'dk'); B(G, .03, .02, .02, 0, .09, -.66, 'dk'); B(G, .03, .02, .04, 0, .095, -.1, 'st');
  B(G, .05, .1, .28, 0, 0, .33, 'wd', [-.12, 0, 0], .012); B(G, .054, .11, .02, 0, -.01, .48, 'rb', [-.12, 0, 0]);
  B(G, .04, .17, .07, 0, -.12, 0, 'dk', [.4, 0, 0]); B(G, .04, .11, .07, 0, -.235, .07, 'dk', [.6, 0, 0]);
  for (var i = 0; i < 4; i++) B(G, .044, .004, .074, 0, -.07 - i * .04, i * .012, 'st', [.4 + i * .06, 0, 0], .001);
  grip(G, .14, 'wd', .35); trig(G, 0, .07); scr(G, .031, 0, -.1); mz(G, 0, .05, -.705);
},
m4: function (G) {
  B(G, .058, .09, .28, 0, .02, 0, 'pl', null, .008); B(G, .06, .07, .2, 0, .03, -.22, 'pl'); rail(G, .084, .12, -.33); vents(G, .0305, .03, -.3, -.15, 6, .03);
  ejp(G, .0295, .04, .0); chg(G, .09, .12); C(G, .012, .3, 0, .04, -.46, 'dk'); brake(G, .04, -.63, .02);
  dot(G, .098, -.02); B(G, .012, .03, .012, 0, .1, -.3, 'dk'); fgrip(G, -.0, -.28); laser(G, .03, -.36);
  mag(G, 0, .036, .2, .06, 'dk', .1); grip(G, .1, 'pl', .3); trig(G, 0, .04); stock(G, .14, .2, .07, 'pl'); scr(G, .029, .0, -.05); mz(G, 0, .04, -.66);
},
falcao: function (G) {
  B(G, .07, .12, .55, 0, .02, 0, 'tn', null, .012); B(G, .072, .06, .3, 0, .05, -.12, 'gr'); vents(G, .0365, .05, -.25, -.0, 7, .03); ejp(G, .0365, .06, .1);
  C(G, .014, .2, 0, .03, -.37, 'dk'); brake(G, .03, -.46, .022); mag(G, .12, .04, .2, .07, 'dk'); grip(G, -.08, 'pl', .3); trig(G, 0, -.05); fgrip(G, -.04, -.26);
  B(G, .05, .04, .1, 0, .1, -.03, 'dk'); optic(G, .13, -.03, .13, .02); rail(G, .084, .15, -.1); chg(G, .09, .18);
  B(G, .06, .14, .03, 0, 0, .29, 'rb'); scr(G, .0355, .0, -.1); laser(G, -.01, -.3); mz(G, 0, .03, -.49);
},
trovao: function (G) {
  B(G, .055, .085, .22, 0, .02, 0, 'st', null, .008); ejp(G, .0275, .04, .0); C(G, .022, .62, 0, .04, -.41, 'gn'); C(G, .02, .5, 0, -.01, -.36, 'st');
  for (var i = 0; i < 3; i++) Rg(G, .022, .004, 0, .04, -.25 - i * .2, 'dk'); Rg(G, .02, .004, 0, -.01, -.6, 'au');
  B(G, .06, .055, .2, 0, -.01, -.3, 'wd', null, .012); for (var j = 0; j < 5; j++) B(G, .064, .004, .008, 0, -.01, -.37 + j * .035, 'dk', null, .001);
  Sp(G, .012, 0, .075, -.7, 'au'); B(G, .01, .06, .02, 0, .085, .06, 'st'); B(G, .05, .1, .3, 0, 0, .3, 'wd', [-.15, 0, 0], .012); B(G, .054, .11, .02, 0, -.01, .45, 'rb', [-.15, 0, 0]);
  grip(G, .1, 'wd', .35); trig(G, 0, .05); scr(G, .0275, .02, .05); mz(G, 0, .04, -.72);
},
cano: function (G) {
  C(G, .02, .55, -.022, .04, -.3, 'gn'); C(G, .02, .55, .022, .04, -.3, 'gn'); B(G, .012, .014, .55, 0, .065, -.3, 'au');
  B(G, .07, .08, .16, 0, .02, 0, 'st', null, .008); for (var i = 0; i < 4; i++) { Rg(G, .0215, .003, -.022, .04, -.15 - i * .1, 'au'); Rg(G, .0215, .003, .022, .04, -.15 - i * .1, 'au'); }
  B(G, .012, .03, .012, -.015, .075, .05, 'au'); B(G, .012, .03, .012, .015, .075, .05, 'au'); B(G, .075, .05, .1, 0, -.01, -.15, 'wd', null, .012);
  B(G, .016, .01, .04, 0, .02, -.085, 'au'); B(G, .055, .11, .34, 0, 0, .28, 'wd', [-.14, 0, 0], .012); B(G, .06, .12, .02, 0, -.01, .45, 'rb', [-.14, 0, 0]);
  grip(G, .08, 'wd', .3); trig(G, 0, .02); Sp(G, .01, 0, .075, -.565, 'au'); scr(G, .0355, .02, 0); mz(G, 0, .04, -.575);
},
marreta: function (G) {
  B(G, .08, .1, .36, 0, .02, 0, 'st', null, .01); vents(G, .0405, .03, -.12, .12, 6, .05); ejp(G, .0405, .05, -.02); C(G, .045, .36, 0, .03, -.34, 'dk');
  for (var i = 0; i < 4; i++) C(G, .05, .015, 0, .03, -.22 - i * .07, 'or'); for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4; B(G, .01, .012, .05, Math.cos(a) * .047, .03 + Math.sin(a) * .047, -.4, 'dk', [0, 0, a]); }
  V(G, .085, .09, 0, -.1, 0, 'dk'); V(G, .088, .02, 0, -.1, 0, 'or'); V(G, .088, .02, 0, -.14, 0, 'st'); for (var j = 0; j < 12; j++) { var b = j * Math.PI / 6; B(G, .008, .08, .008, Math.cos(b) * .086, -.1, Math.sin(b) * .086, 'st'); }
  grip(G, .14, 'pl', .3); trig(G, 0, .08); fgrip(G, -.04, -.28); B(G, .03, .05, .2, 0, .1, -.05, 'or'); dot(G, .13, -.05);
  B(G, .05, .12, .26, 0, 0, .31, 'pl', [-.1, 0, 0], .012); B(G, .056, .13, .02, 0, 0, .44, 'rb', [-.1, 0, 0]); mz(G, 0, .03, -.52);
},
fantasma: function (G) {
  B(G, .05, .08, .34, 0, .02, 0, 'gr', null, .008); vents(G, .0255, .03, -.14, .1, 6, .035); ejp(G, .0255, .04, -.04);
  C(G, .014, .7, 0, .035, -.52, 'dk'); supp(G, .035, -.92, .22, .03); for (var i = 0; i < 6; i++) Rg(G, .015, .003, 0, .035, -.25 - i * .09, 'gn');
  optic(G, .115, -.03, .3, .028); B(G, .05, .01, .012, .045, .04, .06, 'st'); Sp(G, .014, .075, .04, .06, 'au');
  bipod(G, -.5, .14); B(G, .05, .09, .4, 0, 0, .37, 'pl', [-.08, 0, 0], .012); B(G, .05, .04, .16, 0, .08, .4, 'gr'); B(G, .05, .13, .03, 0, -.03, .57, 'rb');
  rail(G, .066, .15, -.12); mag(G, -.01, .036, .1, .06, 'dk'); grip(G, .12, 'pl', .3); trig(G, 0, .06); scr(G, .0255, .0, -.1); mz(G, 0, .035, -1.03);
},
precisao: function (G) {
  B(G, .058, .09, .32, 0, .02, 0, 'tn', null, .008); B(G, .065, .06, .3, 0, .03, -.3, 'gr'); vents(G, .0325, .03, -.42, -.2, 6, .03); ejp(G, .0295, .04, -.02); chg(G, .075, .1);
  C(G, .013, .34, 0, .04, -.56, 'dk'); brake(G, .04, -.76, .022); rail(G, .068, .12, -.45); optic(G, .115, -.05, .24, .024);
  mag(G, 0, .04, .14, .08, 'dk'); grip(G, .12, 'pl', .3); trig(G, 0, .05); fgrip(G, -.0, -.3); bipod(G, -.42, .1);
  B(G, .05, .1, .26, 0, 0, .3, 'pl', [-.1, 0, 0], .012); B(G, .05, .04, .12, 0, .075, .3, 'tn'); B(G, .054, .11, .02, 0, 0, .43, 'rb', [-.1, 0, 0]); scr(G, .029, .0, -.1); mz(G, 0, .04, -.79);
},
titan: function (G) {
  B(G, .075, .11, .4, 0, .02, 0, 'gr', null, .01); vents(G, .0385, .03, -.14, .14, 7, .05); ejp(G, .0385, .05, 0); C(G, .02, .42, 0, .04, -.4, 'dk'); C(G, .035, .28, 0, .04, -.32, 'st');
  for (var i = 0; i < 4; i++) C(G, .037, .012, 0, .04, -.22 - i * .06, 'dk'); for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3; B(G, .014, .014, .1, Math.cos(a) * .036, .04 + Math.sin(a) * .036, -.32, 'dk', [0, 0, a]); }
  brake(G, .04, -.63, .03); B(G, .1, .12, .14, 0, -.1, .02, 'gr', null, .01); for (var j = 0; j < 6; j++) P(G, new T.CylinderGeometry(.008, .008, .03, 8), -.07, -.01 - j * .017, .02, K.au, [0, 0, Math.PI / 2]);
  for (var n = 0; n < 5; n++) B(G, .104, .005, .144, 0, -.06 - n * .02, .02, 'st', null, .001);
  bipod(G, -.55, .16); B(G, .02, .04, .2, 0, .12, -.05, 'st'); B(G, .02, .06, .015, 0, .095, -.15, 'st'); B(G, .02, .06, .015, 0, .095, .05, 'st'); rail(G, .088, .15, -.15);
  grip(G, .14, 'pl', .3); trig(G, 0, .08); B(G, .06, .12, .28, 0, 0, .34, 'pl', [-.1, 0, 0], .012); B(G, .064, .13, .02, 0, 0, .48, 'rb', [-.1, 0, 0]); mz(G, 0, .04, -.66);
},
mortifero: function (G) {
  C(G, .055, .42, 0, .04, -.3, 'gr'); C(G, .062, .03, 0, .04, -.49, 'rd'); for (var m = 0; m < 3; m++) Rg(G, .056, .005, 0, .04, -.2 - m * .1, 'st');
  C(G, .075, .12, 0, .035, -.05, 'st'); for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; C(G, .018, .125, Math.cos(a) * .045, .035 + Math.sin(a) * .045, -.05, 'dk'); }
  Rg(G, .076, .005, 0, .035, .005, 'gn'); Rg(G, .076, .005, 0, .035, -.105, 'gn'); B(G, .06, .08, .2, 0, 0, .12, 'st', null, .008); ejp(G, .0305, .02, .12);
  grip(G, .14, 'wd', .3); trig(G, 0, .08); B(G, .04, .12, .05, 0, -.09, -.3, 'pl'); for (var j = 0; j < 4; j++) B(G, .044, .005, .054, 0, -.05 - j * .025, -.3, 'dk', null, .001);
  B(G, .01, .1, .015, 0, .14, 0, 'dk'); B(G, .03, .01, .015, 0, .19, 0, 'dk'); for (var k = 0; k < 5; k++) B(G, .012, .006, .01, 0, .105 + k * .015, 0, 'bl');
  B(G, .05, .1, .26, 0, 0, .34, 'wd', [-.12, 0, 0], .012); B(G, .054, .11, .02, 0, 0, .47, 'rb', [-.12, 0, 0]); mz(G, 0, .04, -.51);
},
apocalipse: function (G) {
  C(G, .05, .9, 0, .04, -.1, 'gr'); C(G, .095, .2, 0, .04, .45, 'dk', .05); C(G, .054, .04, 0, .04, .1, 'st'); for (var i = 0; i < 4; i++) Rg(G, .051, .005, 0, .04, -.3 - i * .2, 'st');
  C(G, .06, .14, 0, .04, -.62, 'rd'); Cn(G, .06, .14, 0, .04, -.76, 'or', 1, 20); Rg(G, .061, .006, 0, .04, -.55, 'au');
  for (var k = 0; k < 4; k++) { var a = k * Math.PI / 2 + .785; B(G, .005, .05, .06, Math.cos(a) * .09, .04 + Math.sin(a) * .09, .5, 'st', [0, 0, a + 1.57]); }
  grip(G, 0, 'pl', .3); trig(G, 0, -.03); B(G, .035, .12, .05, 0, -.09, -.25, 'pl'); B(G, .03, .03, .1, .075, .07, -.1, 'dk'); B(G, .012, .07, .012, .075, .11, -.1, 'dk');
  B(G, .05, .04, .16, 0, .09, .15, 'wd', null, .01); B(G, .02, .04, .02, 0, .1, -.4, 'au'); mz(G, 0, .04, -.84);
},
plasma: function (G) {
  B(G, .07, .1, .3, 0, .02, 0, 'wh', null, .012); C(G, .03, .34, 0, .04, -.3, 'wh'); B(G, .09, .01, .12, 0, .075, -.1, 'wh');
  for (var i = 0; i < 4; i++) Rg(G, .042, .008, 0, .04, -.2 - i * .07, 'pu'); for (var k = 0; k < 4; k++) B(G, .006, .05, .08, 0, .04, -.2 - k * .07, 'wh', [0, 0, k * 1.57 / 2]);
  Sp(G, .03, 0, .04, -.5, 'pu'); Rg(G, .036, .005, 0, .04, -.5, 'bl'); B(G, .073, .03, .1, 0, .03, 0, 'pu'); B(G, .073, .006, .22, 0, .075, .05, 'pu');
  C(G, .04, .12, 0, .02, .19, 'pu', .03); for (var j = 0; j < 3; j++) Rg(G, .042, .004, 0, .02, .15 + j * .04, 'wh');
  vents(G, .0355, .03, -.1, .1, 5, .05); grip(G, .1, 'dk', .3); trig(G, 0, .04); B(G, .03, .06, .08, 0, -.04, -.12, 'wh'); scr(G, .0355, .05, .1); mz(G, 0, .04, -.5);
},
railgun: function (G) {
  B(G, .02, .04, .7, -.03, .05, -.3, 'st'); B(G, .02, .04, .7, .03, .05, -.3, 'st'); B(G, .04, .012, .7, 0, .05, -.3, 'cy'); B(G, .04, .006, .7, 0, .075, -.3, 'dk');
  for (var i = 0; i < 5; i++) { Rg(G, .05, .008, 0, .05, -.1 - i * .14, 'cy'); B(G, .014, .014, .02, 0, .1, -.1 - i * .14, 'wh'); }
  B(G, .08, .11, .3, 0, .03, .1, 'wh', null, .012); vents(G, .0405, .04, 0, .22, 6, .05); C(G, .03, .22, -.075, 0, .05, 'st'); C(G, .03, .22, .075, 0, .05, 'st');
  for (var j = 0; j < 4; j++) { Rg(G, .031, .004, -.075, 0, -.02 + j * .05, 'gn'); Rg(G, .031, .004, .075, 0, -.02 + j * .05, 'gn'); }
  C(G, .026, .01, -.075, 0, -.06, 'cy'); C(G, .026, .01, .075, 0, -.06, 'cy'); B(G, .06, .02, .2, 0, .095, .1, 'cy');
  grip(G, .12, 'dk', .3); trig(G, 0, .05); B(G, .05, .1, .26, 0, 0, .36, 'dk', [-.1, 0, 0], .012); B(G, .056, .11, .02, 0, 0, .49, 'rb', [-.1, 0, 0]); mz(G, 0, .05, -.66);
},
besta: function (G) {
  B(G, .045, .06, .55, 0, .02, 0, 'wd', null, .01); B(G, .03, .012, .55, 0, .05, 0, 'dk');
  B(G, .28, .025, .035, -.2, .04, -.26, 'st', [0, -.35, 0]); B(G, .28, .025, .035, .2, .04, -.26, 'st', [0, .35, 0]); Sp(G, .014, -.33, .04, -.31, 'au'); Sp(G, .014, .33, .04, -.31, 'au');
  B(G, .38, .004, .004, -.165, .04, -.215, 'bl', [0, -.52, 0]); B(G, .38, .004, .004, .165, .04, -.215, 'bl', [0, .52, 0]);
  B(G, .06, .05, .06, 0, .04, -.26, 'gn'); Rg(G, .05, .005, 0, .02, -.4, 'st'); [-1, 1].forEach(function (s) { B(G, .01, .01, .12, s * .06, .02, -.3, 'st'); });
  optic(G, .1, -.05, .2, .02); B(G, .008, .008, .28, 0, .06, -.15, 'bl'); Cn(G, .01, .04, 0, .06, -.31, 'bl', 1, 4); for (var i = 0; i < 3; i++) B(G, .014, .006, .03, 0, .062, -.02 + i * .02, 'rd');
  B(G, .024, .02, .06, 0, .065, .1, 'st'); grip(G, .1, 'wd', .35); trig(G, 0, .05); B(G, .06, .09, .2, 0, 0, .34, 'wd', [-.1, 0, 0], .012); B(G, .064, .1, .02, 0, 0, .45, 'rb', [-.1, 0, 0]); mz(G, 0, .06, -.33);
},
flame: function (G) {
  B(G, .06, .09, .3, 0, .02, 0, 'rd', null, .01); vents(G, .0305, .02, -.1, .1, 5, .04); ejp(G, .0305, .05, 0); C(G, .018, .5, 0, .04, -.36, 'st'); for (var k = 0; k < 4; k++) Rg(G, .019, .004, 0, .04, -.2 - k * .12, 'au');
  C(G, .035, .1, 0, .04, -.66, 'dk', .028); for (var m = 0; m < 6; m++) { var a = m * Math.PI / 3; C(G, .004, .104, Math.cos(a) * .022, .04 + Math.sin(a) * .022, -.66, 'or'); }
  Sp(G, .016, 0, .04, -.72, 'fi'); Cn(G, .02, .12, 0, .04, -.8, 'fi', 1, 12); Cn(G, .012, .08, 0, .04, -.86, 'wh', 1, 12);
  V(G, .055, .34, -.07, .1, .22, 'rd'); V(G, .055, .34, .07, .1, .22, 'or'); [-.07, .07].forEach(function (x) { Sp(G, .055, x, .27, .22, x < 0 ? 'rd' : 'or'); Sp(G, .055, x, -.07, .22, x < 0 ? 'rd' : 'or'); V(G, .012, .04, x, .31, .22, 'au'); Rg(G, .056, .004, x, .1, .22, 'st'); });
  C(G, .01, .18, -.035, 0, .15, 'dk'); grip(G, .08, 'dk', .3); trig(G, 0, .02); B(G, .04, .1, .05, 0, -.07, -.3, 'dk'); mz(G, 0, .04, -.86);
},
faca: function (G) {
  B(G, .012, .055, .22, 0, 0, -.2, 'bl', null, .002); Cn(G, .0275, .07, 0, 0, -.335, 'bl', .22, 4); B(G, .014, .008, .14, .0, .0, -.19, 'dk'); B(G, .014, .012, .2, 0, .03, -.2, 'st');
  for (var i = 0; i < 7; i++) B(G, .015, .008, .01, 0, .022, -.12 - i * .025, 'dk', [.0, 0, 0]); B(G, .02, .085, .02, 0, 0, -.085, 'au'); B(G, .014, .02, .03, 0, .05, -.085, 'au');
  B(G, .032, .045, .13, 0, 0, -.015, 'pl', null, .01); for (var j = 0; j < 5; j++) B(G, .036, .049, .006, 0, 0, -.06 + j * .022, 'dk', null, .001); Sp(G, .022, 0, 0, .06, 'au'); Rg(G, .012, .004, 0, -.03, .075, 'bl');
  mz(G, 0, 0, -.37);
}
};
/* [nome, tipo, dano, tiros/s, pente (0 = infinito), alcance (m), recuo 0-100] */
var D = {
p9: ['P9 Sentinela', 'Pistola', 24, 6, 15, 40, 20], magnum: ['Magnum Cobra', 'Revólver', 62, 1.8, 6, 55, 55], vespa: ['Vespa', 'Submetralhadora', 18, 14, 32, 30, 25], rajada: ['Rajada', 'Pistola-metralhadora', 14, 18, 25, 22, 35],
ar47: ['AR-47 Ferro', 'Fuzil de assalto', 36, 9, 30, 70, 55], m4: ['M4 Tática', 'Fuzil de assalto', 30, 12, 30, 80, 35], falcao: ['Falcão BP', 'Fuzil bullpup', 33, 10, 35, 85, 28], trovao: ['Trovão', 'Escopeta pump', 90, 1.2, 6, 20, 70],
cano: ['Cano Duplo', 'Escopeta', 110, 1.5, 2, 15, 85], marreta: ['Marreta', 'Escopeta automática', 45, 4, 12, 18, 60], fantasma: ['Fantasma', 'Sniper', 120, .8, 5, 200, 80], precisao: ['Precisão DMR', 'Atiradora', 55, 3.5, 20, 140, 45],
titan: ['Titã', 'Metralhadora', 28, 11, 100, 90, 65], mortifero: ['Mortífero', 'Lança-granadas', 120, .7, 6, 60, 75], apocalipse: ['Apocalipse', 'Lança-foguetes', 180, .4, 1, 100, 90], plasma: ['Plasma Z', 'Energia', 32, 8, 40, 60, 15],
railgun: ['Railgun Volt', 'Energia pesada', 140, .5, 8, 250, 70], besta: ['Besta Caçador', 'Besta', 85, .8, 1, 90, 20], flame: ['Inferno', 'Lança-chamas', 12, 20, 100, 12, 10], faca: ['Faca Tática', 'Corpo a corpo', 50, 2, 0, 2, 0]
};
var SK = { 'Padrão': {}, 'Camuflagem': { map: camo, keys: ['pl', 'gr', 'tn', 'wd'] },
  'Ouro': { st: 0xb8941f, gn: 0xf2cf5b, pl: 0x6e5410, dk: 0x3d3008, gr: 0x8a6d1a, tn: 0xc9a227, wd: 0x7a5a10, wm: 1 },
  'Gelo': { st: 0x7fb7e6, gn: 0xdff3ff, pl: 0x3f7fb0, dk: 0x1d3f58, gr: 0x5a9fcf, tn: 0x9ad0f0, wd: 0x6aa6d0, wm: 1 },
  'Magma': { st: 0x1c0e0b, gn: 0x3b1a12, pl: 0x120807, dk: 0x0a0504, gr: 0x2a120c, tn: 0x40201a, wd: 0x2a1510, rd: 0xff3b00, or: 0xff9100, wm: 1, em: ['rd', 'or'] } };
function bake(G) { /* funde as pecas por material: poucas draw calls, bom pro celular */
  var by = {}; G.children.slice().forEach(function (o) { if (!o.isMesh) return; o.updateMatrix(); var q = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); q.applyMatrix4(o.matrix); var k = o.material.userData.k; (by[k] = by[k] || { m: o.material, g: [] }).g.push(q); G.remove(o); });
  for (var k in by) { var gs = by[k].g, n = 0, a = 0; gs.forEach(function (q) { n += q.attributes.position.count; }); var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    gs.forEach(function (q) { pos.set(q.attributes.position.array, a * 3); nor.set(q.attributes.normal.array, a * 3); uv.set(q.attributes.uv.array, a * 2); a += q.attributes.position.count; });
    var bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(pos, 3)); bg.setAttribute('normal', new T.BufferAttribute(nor, 3)); bg.setAttribute('uv', new T.BufferAttribute(uv, 2));
    var me = new T.Mesh(bg, by[k].m); me.castShadow = true; G.add(me); } }
g.WEAPONS = {
  ids: Object.keys(D), skins: Object.keys(SK),
  info: function (id) { var d = D[id]; return { name: d[0], type: d[1] }; },
  create: function (id, skin) {
    var R = new T.Group(); W[id](R); var cl = {};
    R.children.forEach(function (o) { if (o.isMesh) { var k = o.material.userData.k; o.material = cl[k] = cl[k] || o.material.clone(); } });
    var s = SK[skin] || SK['Padrão'];
    for (var k in cl) { var m = cl[k]; if (s[k] != null) { m.color.setHex(s[k]); if (s.wm && k == 'wd') m.map = null; } if (s.map && s.keys.indexOf(k) > -1) { m.map = s.map; m.color.setHex(0xffffff); } }
    (s.em || []).forEach(function (k) { if (cl[k]) { cl[k].emissive.setHex(s[k]); cl[k].emissiveIntensity = 1.3; } });
    bake(R); var O = new T.Group(); O.add(R); var d = D[id], mo = R.getObjectByName('muzzle');
    var u = { id: id, name: d[0], type: d[1], dmg: d[2], rate: d[3], mag: d[4], range: d[5], recoil: d[6], body: R, kick: 0, fl: 0, t: 0, pm: ['pu', 'cy', 'fi'].map(function (k) { return cl[k]; }).filter(Boolean) };
    if (mo && id != 'faca') { var sp = new T.Sprite(new T.SpriteMaterial({ map: FT, blending: T.AdditiveBlending, transparent: true, depthWrite: false })); sp.scale.setScalar(.001); mo.add(sp); var li = new T.PointLight(0xffaa44, 0, 1.2); mo.add(li); u.sp = sp; u.li = li; }
    O.userData = u; return O;
  },
  fire: function (w) { w.userData.kick = 1; w.userData.fl = 1; },
  update: function (w, dt) {
    var u = w.userData; u.t += dt; u.kick = Math.max(0, u.kick - dt * 7); u.fl = Math.max(0, u.fl - dt * 18);
    u.body.position.z = u.kick * .06; u.body.rotation.x = u.kick * .07;
    if (u.sp) { u.sp.scale.setScalar(.001 + u.fl * .3 * (.7 + Math.random() * .6)); u.sp.material.rotation = Math.random() * 6.28; u.li.intensity = u.fl * 2.5; }
    u.pm.forEach(function (m) { m.emissiveIntensity = 1.4 + .7 * Math.sin(u.t * 4); });
  }
};
})(globalThis);
export const WEAPONS = globalThis.WEAPONS;