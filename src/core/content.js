// Fact rotation: every fact of a location is shown once before any repeats.
export function pickFact(facts, loc, seenIds = []) {
  const pool = facts.filter((f) => f.location === loc);
  if (!pool.length) return { fact: null, seenIds };
  let seen = seenIds.filter((id) => pool.some((f) => f.id === id));
  let unseen = pool.filter((f) => !seen.includes(f.id));
  if (!unseen.length) {
    seen = [];
    unseen = pool;
  }
  const fact = unseen[0];
  return { fact, seenIds: [...seen, fact.id] };
}
