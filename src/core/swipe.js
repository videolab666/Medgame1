// Finger path and swept-circle collision. Pure geometry, independent of FPS.
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

// The finger sweeps one segment while a flying object moves along another.
// Endpoint-only collision misses fast objects crossing the line between frames.
// Check both endpoint-to-segment distances and a proper segment intersection.
// Avoid using the wider swept zone for protected friendly characters.
export function segmentHitsSweptCircle(x1, y1, x2, y2, oldX, oldY, newX, newY, r) {
  if (segmentHitsCircle(x1, y1, x2, y2, oldX, oldY, r)
    || segmentHitsCircle(x1, y1, x2, y2, newX, newY, r)
    || segmentHitsCircle(oldX, oldY, newX, newY, x1, y1, r)
    || segmentHitsCircle(oldX, oldY, newX, newY, x2, y2, r)) return true;

  const cross = (ax, ay, bx, by, cx, cy) =>
    (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const a = cross(x1, y1, x2, y2, oldX, oldY);
  const b = cross(x1, y1, x2, y2, newX, newY);
  const c = cross(oldX, oldY, newX, newY, x1, y1);
  const d = cross(oldX, oldY, newX, newY, x2, y2);
  return ((a <= 0 && b >= 0) || (a >= 0 && b <= 0))
    && ((c <= 0 && d >= 0) || (c >= 0 && d <= 0));
}

// A swipe can begin fast OR become a deliberate slow drag. A stationary tap
// cannot cut. Once the gesture is recognized, subsequent slow move events
// continue cutting until release instead of intermittently dropping hits.
export function createSwipe({ minSpeed, minDistance = 30 }) {
  let last = null;
  let pending = [];
  let distance = 0;
  let armed = false;
  return {
    begin(x, y, t) {
      last = { x, y, t };
      distance = 0;
      armed = false;
      pending.push({ x1: x, y1: y, x2: x, y2: y, speed: 0, active: false, tap: true });
    },
    move(x, y, t) {
      if (!last) return null;
      const dx = x - last.x;
      const dy = y - last.y;
      const length = Math.hypot(dx, dy);
      if (length < 0.01) return null;
      const dt = Math.max(0.001, t - last.t);
      const speed = length / dt;
      distance += length;
      if (!armed && (speed >= minSpeed || distance >= minDistance)) {
        armed = true;
        // Restore segments in this pending frame that preceded recognition.
        for (const seg of pending) if (!seg.tap) seg.active = true;
      }
      const seg = { x1: last.x, y1: last.y, x2: x, y2: y, speed, active: armed, tap: false };
      pending.push(seg);
      last = { x, y, t };
      return seg;
    },
    end() {
      last = null;
      distance = 0;
      armed = false;
    },
    get down() {
      return last !== null;
    },
    takeSegments() {
      const out = pending;
      pending = [];
      return out;
    },
    clear() {
      last = null;
      pending = [];
      distance = 0;
      armed = false;
    },
  };
}
