// Entity motion. Thrown objects follow ballistic arcs; calm-mode bubbles float up.

export function stepEntity(e, dt, gravity) {
  e.age += dt;
  if (e.float) {
    e.y += e.vy * dt;
    e.x += Math.sin(e.age * 1.3 + e.phase) * 30 * dt;
  } else {
    e.vy += gravity * dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }
  e.rot += e.vrot * dt;
}

export function isOffscreen(e, height, width) {
  const m = e.r * 2;
  if (e.x < -m || e.x > width + m) return true;
  if (e.float) return e.y < -m;
  return e.vy > 0 && e.y > height + m;
}
