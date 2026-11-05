// Pure checks shared by the suites: money parsing, totals and tax, sort order, text faults.
// No browser here, so these are unit-tested directly.

/**
 * The money amount in a label ("Item total: $29.99" -> 29.99). With a "$", the number must follow it
 * directly ("$\u221a-1" is not an amount); without one, the first number counts. Undefined when there is none.
 */
export function parseMoney(text: string | null | undefined): number | undefined {
  if (!text) return undefined;
  const number = '(-?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?)';
  const match = text.includes('$') ? new RegExp(`\\$\\s*${number}`).exec(text) : new RegExp(number).exec(text);
  if (!match?.[1]) return undefined;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : undefined;
}

/** Whole cents, rounding half away from zero after removing float noise. */
export function toCents(amount: number): number {
  return Math.sign(amount) * Math.round(Math.abs(Number(amount.toFixed(6))) * 100);
}

export function sumCents(amounts: number[]): number {
  return amounts.reduce((sum, value) => sum + toCents(value), 0);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** A displayed price such as "$29.99" (two decimals, optional thousands separators). */
export function isPriceFormat(text: string): boolean {
  return /^\$(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}$/.test(text.trim());
}

export interface TotalsProblem { field: 'item_total' | 'tax' | 'total'; expected: number; actual: number; message: string }

/**
 * Checkout overview invariants: item total = sum of line prices, tax = item total x rate (to the cent,
 * one cent of slack for rounding mode), total = item total + tax. Amounts in dollars; compared in cents.
 */
export function checkOrderTotals(input: {
  prices: number[];
  itemTotal: number | undefined;
  tax: number | undefined;
  total: number | undefined;
  taxRate?: number;
}): TotalsProblem[] {
  const problems: TotalsProblem[] = [];
  const rate = input.taxRate ?? 0.08;
  const sum = sumCents(input.prices);
  if (input.itemTotal === undefined || toCents(input.itemTotal) !== sum) {
    const actual = input.itemTotal === undefined ? NaN : toCents(input.itemTotal);
    problems.push({ field: 'item_total', expected: sum, actual,
      message: `Item total ${input.itemTotal === undefined ? 'missing' : formatCents(actual)} but the listed prices add up to ${formatCents(sum)}` });
  }
  if (input.itemTotal !== undefined) {
    const base = toCents(input.itemTotal);
    const expectedTax = Math.round(base * rate);
    if (input.tax === undefined || Math.abs(toCents(input.tax) - expectedTax) > 1) {
      const actual = input.tax === undefined ? NaN : toCents(input.tax);
      problems.push({ field: 'tax', expected: expectedTax, actual,
        message: `Tax ${input.tax === undefined ? 'missing' : formatCents(actual)} but ${Math.round(rate * 100)}% of ${formatCents(base)} is ${formatCents(expectedTax)}` });
    }
    if (input.tax !== undefined) {
      const expectedTotal = base + toCents(input.tax);
      if (input.total === undefined || toCents(input.total) !== expectedTotal) {
        const actual = input.total === undefined ? NaN : toCents(input.total);
        problems.push({ field: 'total', expected: expectedTotal, actual,
          message: `Total ${input.total === undefined ? 'missing' : formatCents(actual)} but item total plus tax is ${formatCents(expectedTotal)}` });
      }
    }
  }
  return problems;
}

/** Index of the first element out of order (undefined when sorted). */
export function firstUnsorted<T>(values: T[], compare: (a: T, b: T) => number): number | undefined {
  for (let i = 1; i < values.length; i += 1) {
    if (compare(values[i - 1] as T, values[i] as T) > 0) return i;
  }
  return undefined;
}

export type SortKey = 'az' | 'za' | 'lohi' | 'hilo';

/** Whether a listing of names and prices is in the order a sort option promises. */
export function sortedBy(key: SortKey, items: { name: string; price: number }[]): boolean {
  const byName = (a: { name: string }, b: { name: string }): number => a.name.localeCompare(b.name);
  const byPrice = (a: { price: number }, b: { price: number }): number => a.price - b.price;
  switch (key) {
    case 'az': return firstUnsorted(items, byName) === undefined;
    case 'za': return firstUnsorted(items, (a, b) => byName(b, a)) === undefined;
    case 'lohi': return firstUnsorted(items, byPrice) === undefined;
    case 'hilo': return firstUnsorted(items, (a, b) => byPrice(b, a)) === undefined;
  }
}

/** Text faults a regex can find: leaked template values, placeholders, raw object dumps. */
export const TEXT_FAULTS: { id: string; pattern: RegExp; what: string }[] = [
  { id: 'undefined', pattern: /\bundefined\b/, what: '"undefined" shown to the user' },
  { id: 'nan', pattern: /\bNaN\b/, what: '"NaN" shown to the user' },
  { id: 'object', pattern: /\[object (?:Object|Promise)\]/, what: 'a raw object dump ("[object Object]")' },
  { id: 'template', pattern: /\{\{[^{}\n]{0,80}\}\}|\$\{[A-Za-z_][\w.]{0,60}\}/, what: 'an unrendered template placeholder' },
  { id: 'lorem', pattern: /\blorem ipsum\b/i, what: 'placeholder "lorem ipsum" text' },
];

export interface TextFault { id: string; what: string; match: string; context: string }

/** Every distinct text fault in a block of visible text, with a little context around each. */
export function findTextFaults(text: string): TextFault[] {
  const faults: TextFault[] = [];
  for (const { id, pattern, what } of TEXT_FAULTS) {
    const match = pattern.exec(text);
    if (!match) continue;
    const start = Math.max(0, match.index - 40);
    const context = text.slice(start, match.index + match[0].length + 40).replace(/\s+/g, ' ').trim();
    faults.push({ id, what, match: match[0], context });
  }
  return faults;
}

/**
 * A field that should hold copy but holds something else: empty, a text fault, a literal "null",
 * or a raw i18n key such as "product.backpack.name".
 */
export function fieldFault(value: string | null | undefined): string | undefined {
  const text = (value ?? '').trim();
  if (!text) return 'empty';
  if (/^(?:null|undefined|NaN|TODO|TBD|FIXME)$/i.test(text)) return `placeholder value "${text}"`;
  if (/^[a-z][a-z0-9_-]*(?:\.[a-z0-9_-]+){1,}$/i.test(text) && !/\s/.test(text) && !/^\d/.test(text)) {
    return `raw key "${text}"`;
  }
  const fault = findTextFaults(text)[0];
  return fault ? fault.what : undefined;
}

/** Quoted strings in journey steps (e.g. Choose "Add expense"): the copy a scripted suite asserts. */
export function quotedStrings(steps: string[]): string[] {
  const found: string[] = [];
  for (const step of steps) {
    for (const match of step.matchAll(/["“]([^"”]{1,80})["”]/g)) {
      if (match[1]) found.push(match[1]);
    }
  }
  return found;
}
