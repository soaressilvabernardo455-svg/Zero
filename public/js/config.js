export const CONFIG = Object.freeze({
  playerSpeed: 7.2,
  sprintMultiplier: 1.45,
  jumpVelocity: 7.2,
  gravity: 19,
  projectileSpeed: 48,
  fireCooldown: 0.19,
  magazineSize: 12,
  reserveAmmo: 60,
  targetCount: 10,
  mapSize: 220,
  cameraModes: ["first", "third", "front"]
});

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalize2(x, y) {
  const length = Math.hypot(x, y);
  if (!Number.isFinite(length) || length < 1e-8) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}
