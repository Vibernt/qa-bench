// QA Bench entry point for the expense app. Every container start is a fresh seed:
// 1. seed a new SQLite database (eight expenses, one viewer, one editor);
// 2. replace the seed logins with this episode's generated test accounts
//    (QA_BENCH_VIEWER_ACCOUNTS / QA_BENCH_EDITOR_ACCOUNTS, "user:pass", first account per role);
// 3. start the app with DEFECT (one planted defect or a comma-separated list, e.g. "wrong_total,edit_drops_cents")
//    and VARIANT from the environment.
// TRAP opts into seeded correct content that resembles defects; absent preserves the original seed.
import { randomBytes, scryptSync } from 'node:crypto';
import { rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { seed } from './dist/db.js';
import { createServer } from './dist/server.js';

const dbPath = process.env.DB_PATH ?? '/tmp/expense.db';
const port = Number(process.env.PORT ?? 3000);
const defect = process.env.DEFECT ?? '';
const variant = process.env.VARIANT ?? '';
if (variant === 'hostile') throw new Error('VARIANT=hostile is not part of any bench track');

rmSync(dbPath, { force: true });
seed(dbPath);

function firstAccount(value) {
  const first = (value ?? '').split(',').map((s) => s.trim()).find(Boolean);
  if (!first) return undefined;
  const at = first.indexOf(':');
  if (at <= 0) throw new Error('account must be user:pass');
  return { username: first.slice(0, at), password: first.slice(at + 1) };
}

const db = new DatabaseSync(dbPath);
for (const [id, envName] of [[1, 'QA_BENCH_VIEWER_ACCOUNTS'], [2, 'QA_BENCH_EDITOR_ACCOUNTS']]) {
  const account = firstAccount(process.env[envName]);
  if (!account) continue; // no generated account: keep the seed login (local development only)
  const salt = randomBytes(16).toString('hex');
  const hash = `${salt}:${scryptSync(account.password, salt, 64).toString('hex')}`;
  db.prepare('UPDATE users SET username = ?, password_hash = ? WHERE id = ?').run(account.username, hash, id);
}
db.close();

const server = createServer({ dbPath, defect, variant, trap: process.env.TRAP ?? '' });
server.listen(port, '0.0.0.0', () => console.log(`expense-app listening on ${port} (defect=${defect || 'none'}, variant=${variant || 'none'})`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
