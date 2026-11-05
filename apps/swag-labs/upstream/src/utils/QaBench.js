// QA-BENCH: bench-mode switches for QA Bench (not part of upstream sample-app-web).
// The container writes /runtime-config.js at start from QA_BENCH_ACCOUNTS, QA_BENCH_MUTATIONS and QA_BENCH_CHANGES
// (see apps/swag-labs/bench/runtime-config.sh), so one build serves every episode. Accounts are salted hashes, and
// mutations and changes are bit flags, not names. Without that file (or with it empty) the app behaves exactly as upstream.
const RT = (typeof window !== "undefined" && window.__SL_RUNTIME__) || {};

// Bit values must match apps/swag-labs/bench/runtime-config.sh.
const MUTATION_BITS = {
  problem_user: 1,
  error_user: 2,
  visual_user: 4,
  performance_glitch_user: 8,
  locked_out_user: 16,
};
const CHANGE_BITS = {
  relabel: 1,
  "seasonal-banner": 2,
  "checkout-copy": 4,
  "price-change": 8,
};

// Synchronous SHA-256 (hex) of a UTF-8 string. crypto.subtle is async and absent on plain-http hostnames, and the
// credential checks below are synchronous upstream.
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
  0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
  0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
  0xc67178f2,
];
export function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const len = bytes.length;
  const padded = new Uint8Array((((len + 8) >> 6) + 1) << 6);
  padded.set(bytes);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(len / 0x20000000));
  view.setUint32(padded.length - 4, (len << 3) >>> 0);
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const W = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }
  return H.map((x) => x.toString(16).padStart(8, "0")).join("");
}

// Accounts arrive as "sha256(salt LF user):sha256(salt LF user LF pass)" (see runtime-config.sh), never in clear.
const SALT = typeof RT.s === "string" ? RT.s : "";
const ACCOUNTS = (Array.isArray(RT.a) ? RT.a : []).map((entry) => {
  const [user, pass] = String(entry).split(":");
  return { user, pass };
});
const userHash = (username) => sha256Hex(`${SALT}\n${username}`);

/** Bench mode: the episode's generated accounts are the only way in. */
export function benchMode() {
  return ACCOUNTS.length > 0;
}

export function benchAccountOk(username, password) {
  if (typeof username !== "string" || typeof password !== "string") return false;
  const u = userHash(username);
  const p = sha256Hex(`${SALT}\n${username}\n${password}`);
  return ACCOUNTS.some((a) => a.user === u && a.pass === p);
}

export function benchIsAccount(username) {
  if (typeof username !== "string") return false;
  const u = userHash(username);
  return ACCOUNTS.some((a) => a.user === u);
}

/** True when the built-in faulty user `name`'s behaviour is switched on for this (generated) username. */
export function benchFaulty(name, username) {
  return benchIsAccount(username) && ((RT.m || 0) & MUTATION_BITS[name]) !== 0;
}

/** True when the deliberate change `name` (QA_BENCH_CHANGES) is on. Changes are not bugs. */
export function benchChange(name) {
  return ((RT.c || 0) & CHANGE_BITS[name]) !== 0;
}

// Copy swapped by deliberate changes. Keys are upstream strings; data-test ids never change.
const COPY = {
  relabel: {
    "Add to cart": "Add to basket",
    "Your Cart": "Your Basket",
  },
  "checkout-copy": {
    "Checkout: Your Information": "Checkout: Your details",
    "Checkout: Overview": "Checkout: Review your order",
    "Thank you for your order!": "Order placed. Thank you!",
    "Your order has been dispatched, and will arrive just as fast as the pony can get there!":
      "Your order is on its way and will reach you as fast as the pony can carry it.",
  },
};

/** Upstream copy, or its replacement when a deliberate change rewords it. */
export function benchText(text) {
  for (const [change, table] of Object.entries(COPY)) {
    if (benchChange(change) && table[text] !== undefined) return table[text];
  }
  return text;
}

// price-change: the backpack costs less. Every page reads prices from the inventory data, so the cart, item total,
// tax and total stay consistent.
export function benchPrices(items) {
  if (!benchChange("price-change")) return items;
  for (const item of items) {
    if (item.name === "Sauce Labs Backpack") item.price = 24.99;
  }
  return items;
}
