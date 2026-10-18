// Background music. Recorded tracks live in public/music/<name>.mp3 and are
// listed in public/music/index.json. When a track is missing, the procedural
// ambient pad from the synth plays instead.
import gsap from 'gsap';

export const MUSIC_NAMES = Object.freeze([
  'main', 'menu', 'hands', 'kitchen', 'blood', 'mouth', 'tummy', 'skin', 'calm', 'rest', 'reward',
]);

// `main` is the shared background track: it plays wherever a scene has no
// track of its own — except the calm mode, which keeps its quiet breathing pad.
const SHARED = 'main';
const NO_SHARED = new Set(['calm']);
const VOLUME = 0.35;
// Per-track loudness: the shared track is mastered loud, so it plays at half
// volume to leave room for the sound effects.
const VOLUMES = { main: 0.5 };
const volumeOf = (name) => VOLUMES[name] ?? VOLUME;

export function createMusic(synth) {
  let available = new Set();
  let current = null;
  let currentName = null;
  let muted = false;

  function fadeOut(audio) {
    gsap.killTweensOf(audio);
    gsap.to(audio, { volume: 0, duration: 0.6, onComplete: () => audio.pause() });
  }

  return {
    async init() {
      try {
        const res = await fetch('music/index.json', { cache: 'no-cache' });
        if (res.ok) available = new Set((await res.json()).filter((n) => MUSIC_NAMES.includes(n)));
      } catch {
        available = new Set();
      }
    },
    // Name of the track (or pad) playing now, plus its current volume.
    get playing() {
      return { name: currentName, volume: current ? current.volume : null, file: current?.src ?? null };
    },
    // Loop a scene track; falls back to the synth pad (calm flavour for calm/rest).
    play(scene) {
      const name = available.has(scene) ? scene
        : !NO_SHARED.has(scene) && available.has(SHARED) ? SHARED : scene;
      // The same file keeps playing across scenes (no restart on every round).
      if (name === currentName) return;
      currentName = name;
      if (current) fadeOut(current);
      current = null;
      synth.stopAmbient();
      if (!available.has(name)) {
        synth.startAmbient(name === 'calm' || name === 'rest');
        return;
      }
      const audio = new Audio(`music/${name}.mp3`);
      audio.loop = true;
      audio.volume = 0;
      current = audio;
      if (!muted) {
        audio.play().catch(() => {});
        gsap.to(audio, { volume: volumeOf(name), duration: 1.2 });
      }
    },
    // Short one-shot jingle (reward screen) on top of a ducked loop.
    jingle(name) {
      if (muted || !available.has(name)) return false;
      const audio = new Audio(`music/${name}.mp3`);
      audio.volume = 0.6;
      audio.play().catch(() => {});
      if (current) {
        const v = volumeOf(currentName);
        gsap.to(current, { volume: v * 0.3, duration: 0.3 });
        audio.addEventListener('ended', () => current && gsap.to(current, { volume: v, duration: 0.8 }), { once: true });
      }
      return true;
    },
    stop() {
      if (current) fadeOut(current);
      current = null;
      currentName = null;
      synth.stopAmbient();
    },
    setMuted(b) {
      muted = b;
      if (!current) return;
      if (b) current.pause();
      else {
        current.play().catch(() => {});
        gsap.to(current, { volume: volumeOf(currentName), duration: 0.6 });
      }
    },
    // Browsers start audio only after a user gesture.
    unlock() {
      if (current && current.paused && !muted) {
        current.play().catch(() => {});
        gsap.to(current, { volume: volumeOf(currentName), duration: 0.8 });
      }
    },
  };
}
