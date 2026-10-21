// Game sound effects. Gentle by design (spec R2): pentatonic xylophone, soft
// pops, giggles and a quiet ambient pad. No sirens, no booms, no sub-bass
// pulses. A compressor caps peaks.
//
// Every effect is procedural by default. Recorded samples override it when
// public/sfx/<name>.mp3 exists and <name> is listed in public/sfx/index.json
// (see docs/music/suno-prompts.md for the list of names).

const PENTA = [0, 2, 4, 7, 9]; // C D E G A
const BASE_MIDI = 72; // C5
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

export const SFX_NAMES = Object.freeze([
  'xylo-1', 'xylo-2', 'xylo-3', 'xylo-4', 'xylo-5',
  'pop', 'slice', 'drop', 'giggle', 'combo', 'wave', 'shield', 'slow', 'sparkle', 'fanfare', 'tap',
]);

export function createSynth() {
  let ctx = null;
  let master = null;
  let ambient = null;
  let muted = false;
  let volume = 0.4;
  let sampleList = [];
  const samples = new Map();

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(comp).connect(ctx.destination);
    decodeSamples();
    return ctx;
  }

  async function decodeSamples() {
    await Promise.all(
      sampleList.map(async (name) => {
        try {
          const res = await fetch(`sfx/${name}.mp3`);
          if (!res.ok) return;
          samples.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {
          // Missing or broken file: the procedural sound stays in use.
        }
      }),
    );
  }

  const ready = () => ctx && ctx.state === 'running' && !muted;

  // Plays a recorded sample if one is loaded; returns false otherwise.
  function sample(name, { rate = 1, gain = 0.8 } = {}) {
    const buf = samples.get(name);
    if (!buf) return false;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = rate;
    g.gain.value = gain;
    src.connect(g).connect(master);
    src.start();
    return true;
  }

  function tone(freq, { type = 'sine', at = 0, attack = 0.004, decay = 0.35, gain = 0.3, glideTo = null } = {}) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + decay);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  const procedural = {
    note(i) {
      const step = PENTA[i % PENTA.length];
      const octave = Math.min(Math.floor(i / PENTA.length), 2);
      const f = midiHz(BASE_MIDI + step + 12 * octave);
      tone(f, { decay: 0.4, gain: 0.28 });
      tone(f * 4, { decay: 0.12, gain: 0.05 });
      tone(f * 2.76, { type: 'triangle', decay: 0.08, gain: 0.04 });
    },
    pop() {
      tone(520, { decay: 0.09, gain: 0.22, glideTo: 1400 });
      tone(1900, { type: 'triangle', at: 0.02, decay: 0.05, gain: 0.05 });
    },
    giggle() {
      [0, 0.09, 0.18].forEach((at, k) => tone(700 + k * 140, { type: 'triangle', at, decay: 0.08, gain: 0.12, glideTo: 900 + k * 160 }));
    },
    chime() {
      [0, 4, 7, 12].forEach((s, k) => tone(midiHz(BASE_MIDI + s), { at: k * 0.07, decay: 0.6, gain: 0.16 }));
    },
    warning() {
      // A brief gentle two-tone cue, never a siren or alarming buzzer.
      tone(660, { type: 'sine', decay: 0.16, gain: 0.075 });
      tone(520, { type: 'sine', at: 0.18, decay: 0.2, gain: 0.07 });
    },
    sparkle() {
      for (let k = 0; k < 5; k++) tone(midiHz(BASE_MIDI + 12 + PENTA[k]), { at: k * 0.045, decay: 0.18, gain: 0.07 });
    },
    whoosh() {
      tone(300, { decay: 0.5, gain: 0.12, glideTo: 1200 });
      tone(600, { type: 'triangle', at: 0.05, decay: 0.45, gain: 0.05, glideTo: 2000 });
    },
    squish() {
      tone(240, { type: 'triangle', decay: 0.12, gain: 0.12, glideTo: 520 });
    },
    bloop() {
      tone(880, { decay: 0.1, gain: 0.1, glideTo: 1320 });
    },
    tap() {
      tone(1200, { type: 'triangle', decay: 0.04, gain: 0.05 });
    },
  };

  // name of the sample, procedural fallback
  const fire = (name, fallback, opts) => {
    if (!ready()) return;
    if (!sample(name, opts)) fallback();
  };

  return {
    setSampleList(list) {
      sampleList = list.filter((n) => SFX_NAMES.includes(n));
      if (ctx) decodeSamples();
    },
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
    },
    setMuted(b) {
      muted = b;
      if (master) master.gain.setTargetAtTime(b ? 0 : volume, ctx.currentTime, 0.05);
    },
    setVolume(v) {
      volume = v;
      if (master && !muted) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
    },
    // Xylophone note; i grows with combo so chains climb the scale.
    note(i) {
      if (!ready()) return;
      const k = Math.max(0, i - 1);
      const octave = Math.min(Math.floor(k / PENTA.length), 2);
      if (!sample(`xylo-${(k % PENTA.length) + 1}`, { rate: 2 ** octave, gain: 0.7 })) procedural.note(k);
    },
    pop: () => fire('pop', procedural.pop),
    slice: () => fire('slice', procedural.squish, { gain: 0.7 }),
    drop: () => fire('drop', procedural.bloop, { gain: 0.6 }),
    giggle: () => fire('giggle', procedural.giggle),
    warning: () => { if (ready()) procedural.warning(); },
    combo: () => fire('combo', procedural.chime),
    wave: () => fire('wave', procedural.whoosh),
    shield: () => fire('shield', procedural.chime),
    slow: () => fire('slow', procedural.chime),
    sparkle: () => fire('sparkle', procedural.sparkle, { gain: 0.6 }),
    fanfare: () => fire('fanfare', procedural.chime),
    tap: () => fire('tap', procedural.tap, { gain: 0.5 }),
    chime: () => fire('combo', procedural.chime),
    startAmbient(calm = false) {
      if (!ensure() || ambient) return;
      const out = ctx.createGain();
      out.gain.value = 0;
      out.gain.setTargetAtTime(calm ? 0.07 : 0.05, ctx.currentTime, 1.2);
      out.connect(master);
      const chord = calm ? [48, 55, 60, 64] : [60, 64, 67, 72];
      const oscs = chord.map((m, k) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = midiHz(m);
        o.detune.value = (k - 1.5) * 4;
        const g = ctx.createGain();
        g.gain.value = 0.25;
        o.connect(g).connect(out);
        o.start();
        return o;
      });
      // Sparse arpeggio of pentatonic notes.
      const period = calm ? 1.6 : 0.8;
      let step = 0;
      const timer = setInterval(() => {
        if (!ready()) return;
        if (Math.random() < 0.65) {
          const f = midiHz(BASE_MIDI + PENTA[(step * 2) % 5] + (step % 3 === 0 ? 12 : 0));
          tone(f, { decay: calm ? 1.2 : 0.6, gain: calm ? 0.05 : 0.04 });
        }
        step++;
      }, period * 1000);
      ambient = { out, oscs, timer };
    },
    stopAmbient() {
      if (!ambient) return;
      const { out, oscs, timer } = ambient;
      clearInterval(timer);
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      setTimeout(() => oscs.forEach((o) => o.stop()), 1500);
      ambient = null;
    },
  };
}
