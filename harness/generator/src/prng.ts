// Small seeded PRNG helpers. Implemented here (no dependency) so episode generation is reproducible
// byte for byte on any machine and Node version.

/** mulberry32: 32-bit state, period 2^32. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a over a string, for mixing labels into seeds. */
export function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Derive a child seed from a parent seed and a tag (e.g. the episode index), as a non-negative 31-bit integer
 * so it round-trips through JSON and the schema's `integer` cleanly.
 */
export function deriveSeed(parent: number, tag: string | number): number {
  let h = fnv1a(`${parent >>> 0}:${tag}`);
  // splitmix-style finaliser
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) & 0x7fffffff;
}

export class Rng {
  private readonly next: () => number;
  constructor(seed: number) {
    this.next = mulberry32(seed);
  }
  float(): number {
    return this.next();
  }
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number {
    if (max < min) return min;
    return min + Math.floor(this.next() * (max - min + 1));
  }
  /** Fisher-Yates shuffle into a new array. */
  shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j] as T, out[i] as T];
    }
    return out;
  }
  /** Pick one item with probability proportional to its weight. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    if (!items.length) throw new Error('weighted pick from an empty list');
    const total = items.reduce((s, it) => s + weight(it), 0);
    let r = this.next() * total;
    for (const it of items) {
      r -= weight(it);
      if (r < 0) return it;
    }
    return items[items.length - 1] as T;
  }
  /** Lowercase hex string of n characters. */
  hex(n: number): string {
    let s = '';
    for (let i = 0; i < n; i++) s += Math.floor(this.next() * 16).toString(16);
    return s;
  }
  /** Random string over an alphabet. */
  token(n: number, alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'): string {
    let s = '';
    for (let i = 0; i < n; i++) s += alphabet[Math.floor(this.next() * alphabet.length)];
    return s;
  }
}
