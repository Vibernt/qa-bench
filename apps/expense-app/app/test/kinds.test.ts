import { describe, it, expect } from 'vitest';
import { kindProbes, kindSwitches, kindCombinations, type Client } from '../../verification/kinds.ts';
import { parseTraps, seedTraps } from '../src/switches/traps.js';
import { DatabaseSync } from 'node:sqlite';
import { startApp, postForm, type RunningApp } from './helpers.js';

async function client(app: RunningApp): Promise<Client> {
  const cookie = await app.login();
  return {
    get: async path => { const r = await fetch(app.baseUrl + path, { headers: { cookie }, redirect: 'manual' }); return { status: r.status, html: await r.text() }; },
    post: async (path, fields) => { const r = await postForm(app.baseUrl, path, cookie, fields); return { status: r.status, location: r.headers.get('location') ?? '', html: await r.text() }; },
  };
}

describe('HU-G defect and trap route evidence', () => {
  for (const [id, probe] of Object.entries(kindProbes)) {
    it(`${id} appears only with its switch`, async () => {
      const env = kindSwitches[id]!;
      for (const enabled of [false, true]) {
        const app = await startApp(enabled ? env.DEFECT ?? '' : '', enabled ? env.TRAP ?? '' : '');
        try { expect(await probe(await client(app)), `${id} enabled=${enabled}`).toBe(enabled); }
        finally { await app.close(); }
      }
    });
  }
  for (const members of kindCombinations) it(`combines ${members.join(', ')}`, async () => {
    const envs = members.map(id => kindSwitches[id]).filter(Boolean);
    const old = members.find(id => !kindSwitches[id])!;
    const oldName = { 'expense.edit-drops-cents': 'edit_drops_cents', 'expense.long-title-truncated': 'long_title_truncated',
      'expense.edit-resets-category': 'edit_resets_category', 'expense.total-under-filter': 'total_under_filter' }[old]!;
    const app = await startApp([oldName, ...envs.map(e => e!.DEFECT).filter(Boolean)].join(','), envs.map(e => e!.TRAP).filter(Boolean).join(','));
    try {
      const c = await client(app);
      for (const id of members.filter(id => kindProbes[id])) expect(await kindProbes[id]!(c), id).toBe(true);
      if (oldName === 'edit_drops_cents') {
        await c.post('/expenses/5', { title: 'Cents probe', category: 'meals', amount: '12.50' });
        expect(app.expenseAmount(5)).toBe(1200);
      } else if (oldName === 'long_title_truncated') {
        await c.post('/expenses', { title: 'A title longer than twenty characters', category: 'office', amount: '1' });
        expect(app.countByTitle('A title longer than ')).toBe(1);
      } else if (oldName === 'edit_resets_category') {
        expect((await c.get('/expenses/2/edit')).html).not.toContain('value="meals" selected');
      } else {
        expect((await c.get('/expenses?category=meals')).html).toContain('Total: $423.99');
      }
    } finally { await app.close(); }
  });
  it('parses comma lists, blanks and duplicates and refuses unknown trap names', () => {
    expect([...parseTraps(' refund_row, ,braces_title,refund_row ')]).toEqual(['refund_row','braces_title']);
    expect([...parseTraps(undefined)]).toEqual([]);
    expect(() => parseTraps('refund_row,typo')).toThrow('Unknown TRAP: typo');
    expect(() => parseTraps(['typo'])).toThrow('Unknown TRAP: typo');
  });
  it('trap seeding is idempotent and empty_category is a filter-only option', async () => {
    const app = await startApp('', 'refund_row,braces_title,empty_category,legit_duplicate');
    try {
      const db = new DatabaseSync(app.dbPath);
      try {
        seedTraps(db, parseTraps('refund_row,braces_title,empty_category,legit_duplicate'));
        expect(db.prepare('SELECT COUNT(*) AS n FROM expenses').get()).toEqual({ n: 12 });
        expect(db.prepare("SELECT COUNT(*) AS n FROM expenses WHERE category = 'training'").get()).toEqual({ n: 0 });
      } finally { db.close(); }
    } finally { await app.close(); }
  });
});
