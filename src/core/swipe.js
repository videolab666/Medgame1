// Finger trail -> line segments with speed, plus segment/circle hit test.

export function segmentHitsCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((cx - x1) * dx + (cy - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + dx * t - cx;
  const py = y1 + dy * t - cy;
  return px * px + py * py <= r * r;
}

export function createSwipe({ minSpeed }) {
  let last = null;
  let pending = [];
  return {
    begin(x, y, t) {
      last = { x, y, t };
      pending.push({ x1: x, y1: y, x2: x, y2: y, speed: 0, active: false, tap: true });
    },
    move(x, y, t) {
      if (!last) return;
      const dt = Math.max(0.001, t - last.t);
      const speed = Math.hypot(x - last.x, y - last.y) / dt;
      pending.push({ x1: last.x, y1: last.y, x2: x, y2: y, speed, active: speed >= minSpeed, tap: false });
      last = { x, y, t };
    },
    end() {
      last = null;
    },
    get down() {
      return last !== null;
    },
    takeSegments() {
      const out = pending;
      pending = [];
      return out;
    },
  };
}
