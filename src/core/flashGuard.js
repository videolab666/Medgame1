// Photosensitivity guard (WCAG 2.3.1): any full-screen brightness change must
// ask here first. Allows at most one flash per `minMs`.
export function createFlashGuard(minMs = 400, now = () => performance.now()) {
  let last = -Infinity;
  return {
    tryFlash() {
      const t = now();
      if (t - last < minMs) return false;
      last = t;
      return true;
    },
  };
}
