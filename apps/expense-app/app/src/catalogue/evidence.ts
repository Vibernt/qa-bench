import { DatabaseSync } from 'node:sqlite';
import { FixtureError } from './entry.js';

/** Trusted harness lane. Never exposes arbitrary SQL or a browser-accessible evidence endpoint. */
export function readExpenseEvidence(dbPath: string, provider: string, args: Record<string, unknown>): unknown {
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(dbPath, { readOnly: true });
    switch (provider) {
      case 'expense.byTitle':
        if (typeof args.title !== 'string') throw new Error('expense.byTitle requires title');
        return db.prepare('SELECT * FROM expenses WHERE title = ? ORDER BY id').all(args.title);
      case 'expense.byId': {
        const id = typeof args.id === 'string' && /^\d+$/.test(args.id) ? Number(args.id) : args.id;
        if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) throw new Error('expense.byId requires positive id');
        return db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) ?? null;
      }
      case 'expense.list': case 'expense.sum': {
        if (args.category !== undefined && typeof args.category !== 'string') throw new Error('category must be a string');
        const sum = provider === 'expense.sum'; const columns = sum ? 'COALESCE(SUM(amount_cents), 0) AS total_cents' : '*';
        const query = `SELECT ${columns} FROM expenses${args.category === undefined ? '' : ' WHERE category = ?'}${sum ? '' : ' ORDER BY id'}`;
        const statement = db.prepare(query); const values = args.category === undefined ? [] : [args.category as string];
        return sum ? statement.get(...values) : statement.all(...values);
      }
      default: throw new Error(`Unsupported evidence provider: ${provider}`);
    }
  } catch (cause) { throw new FixtureError('EVIDENCE', `Trusted evidence unavailable: ${provider}`, { cause }); }
  finally { db?.close(); }
}
