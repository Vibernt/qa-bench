import { it, expect } from 'vitest';
import { createDatabase } from '../src/db.js';
import { parseTraps, seedTraps } from '../src/switches/traps.js';

for (const name of ['refund_row','braces_title','empty_category','legit_duplicate']) it(`${name} changes only its opt-in seed (no listener)`, () => {
  const db = createDatabase(':memory:');
  try {
    db.prepare("INSERT INTO users VALUES (2, 'seed-editor', 'unused-test-hash', 'editor')").run();
    seedTraps(db, parseTraps(''));
    expect(db.prepare('SELECT COUNT(*) AS n FROM expenses').get()).toEqual({ n: 0 });
    seedTraps(db, parseTraps(name));
    seedTraps(db, parseTraps(name));
    const rows = db.prepare('SELECT id, title, category, amount_cents FROM expenses ORDER BY id').all();
    if (name === 'refund_row') expect(rows).toEqual([{ id: 101, title: 'Refund: conference ticket', category: 'travel', amount_cents: -2500 }]);
    if (name === 'braces_title') expect(rows).toEqual([{ id: 102, title: 'Lunch {team offsite}', category: 'meals', amount_cents: 1800 }]);
    if (name === 'empty_category') expect(rows).toEqual([]);
    if (name === 'legit_duplicate') expect(rows).toEqual([
      { id: 103, title: 'Weekly bus pass', category: 'travel', amount_cents: 1200 },
      { id: 104, title: 'Weekly bus pass', category: 'travel', amount_cents: 1200 },
    ]);
  } finally { db.close(); }
});
