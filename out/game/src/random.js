// A small seeded random number generator (mulberry32) with the handful of draws the game needs.
// The same seed gives the same sequence, which is what makes the screenshot scenes repeatable.

/** A seeded generator: float() in [0,1), int(n) in [0,n), pick(list) one element. */
export function createRandom(seed) {
  let a = seed | 0;
  const float = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    float,
    /** A whole number in [0, n). */
    int(n) { return Math.min(n - 1, Math.floor(float() * n)); },
    /** One element of a non-empty list. */
    pick(list) { return list[Math.min(list.length - 1, Math.floor(float() * list.length))]; },
    /** A float in [lo, hi). */
    range(lo, hi) { return lo + float() * (hi - lo); },
  };
}
