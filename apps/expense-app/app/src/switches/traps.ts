import type { DatabaseSync } from 'node:sqlite';

export const trapNames = ['refund_row', 'braces_title', 'empty_category', 'legit_duplicate'] as const;
export type Trap = typeof trapNames[number];
export function parseTraps(value: string | readonly string[] | undefined): Set<Trap> {
  const names = (typeof value === 'string' ? value.split(',') : [...(value ?? [])]).map(n => n.trim()).filter(Boolean);
  for (const name of names) if (!(trapNames as readonly string[]).includes(name)) throw new Error(`Unknown TRAP: ${name}`);
  return new Set(names as Trap[]);
}

/** Idempotent per seed: no writes at all when disabled. Fixed ids make repeat server starts safe. */
export function seedTraps(db: DatabaseSync, traps: ReadonlySet<Trap>): void {
  const rows: [Trap, number, string, string, number][] = [
    ['refund_row', 101, 'Refund: conference ticket', 'travel', -2500],
    ['braces_title', 102, 'Lunch {team offsite}', 'meals', 1800],
    ['legit_duplicate', 103, 'Weekly bus pass', 'travel', 1200],
    ['legit_duplicate', 104, 'Weekly bus pass', 'travel', 1200],
  ];
  for (const [name, id, title, category, amount] of rows) {
    if (traps.has(name)) db.prepare('INSERT OR IGNORE INTO expenses (id, title, category, amount_cents, created_by, updated_at) VALUES (?, ?, ?, ?, 2, ?)')
      .run(id, title, category, amount, '2026-01-09T10:00:00.000Z');
  }
}
