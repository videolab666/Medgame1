// Render quality tier from the average FPS of the first seconds of play.
export const QUALITY = Object.freeze({
  high: { bloom: 1, godray: true, particles: 2000 },
  mid: { bloom: 0.5, godray: false, particles: 800 },
  low: { bloom: 0, godray: false, particles: 300 },
});

export function pickQuality(avgFps) {
  if (avgFps >= 50) return 'high';
  if (avgFps >= 35) return 'mid';
  return 'low';
}
