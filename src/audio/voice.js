// Voice-over slot. Recorded lines go to public/voice/<id>.mp3 and their ids are
// listed in public/voice/index.json. Until then the list is empty and nothing
// is requested.
let available = new Set();
let current = null;

export async function initVoice() {
  try {
    const res = await fetch('voice/index.json', { cache: 'no-cache' });
    if (res.ok) available = new Set(await res.json());
  } catch {
    available = new Set();
  }
}

export function playVoice(id, { muted = false } = {}) {
  if (muted || !available.has(id)) return;
  if (current) current.pause();
  current = new Audio(`voice/${id}.mp3`);
  current.volume = 0.9;
  current.play().catch(() => {});
}
