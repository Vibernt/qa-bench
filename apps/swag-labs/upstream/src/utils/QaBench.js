// QA-BENCH: bench-mode switches for QA Bench (not part of upstream sample-app-web).
// The container writes /runtime-config.js at start from QA_BENCH_ACCOUNTS, QA_BENCH_MUTATIONS and QA_BENCH_CHANGES
// (see apps/swag-labs/bench/runtime-config.sh), so one build serves every episode. Mutations and changes are bit
// flags there, not names. Without that file (or with it empty) the app behaves exactly as upstream.
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

function decodeAccounts(b64) {
  if (!b64) return [];
  let text = "";
  try {
    text = atob(b64);
  } catch {
    return [];
  }
  return text
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf(":");
      return { username: pair.slice(0, i), password: pair.slice(i + 1) };
    });
}

const ACCOUNTS = decodeAccounts(RT.a);

/** Bench mode: the episode's generated accounts are the only way in. */
export function benchMode() {
  return ACCOUNTS.length > 0;
}

export function benchAccountOk(username, password) {
  return ACCOUNTS.some((a) => a.username === username && a.password === password);
}

export function benchIsAccount(username) {
  return ACCOUNTS.some((a) => a.username === username);
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
