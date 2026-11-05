import { scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export type Role = 'viewer' | 'editor';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
}

export interface Expense {
  id: number;
  title: string;
  category: string;
  amount_cents: number;
  created_by: number;
  updated_at: string;
}

const users = [
  { id: 1, username: 'viewer', password: 'viewer-test-password', role: 'viewer' as const, salt: 'viewer-fixture-salt' },
  { id: 2, username: 'editor', password: 'editor-test-password', role: 'editor' as const, salt: 'editor-fixture-salt' },
];

const expenses: Omit<Expense, 'id'>[] = [
  { title: 'Train to Pune', category: 'travel', amount_cents: 4250, created_by: 2, updated_at: '2026-01-01T10:00:00.000Z' },
  { title: 'Team lunch', category: 'meals', amount_cents: 6840, created_by: 2, updated_at: '2026-01-02T10:00:00.000Z' },
  { title: 'Notebooks', category: 'office', amount_cents: 1299, created_by: 2, updated_at: '2026-01-03T10:00:00.000Z' },
  { title: 'Client taxi', category: 'travel', amount_cents: 1875, created_by: 2, updated_at: '2026-01-04T10:00:00.000Z' },
  { title: 'Coffee with team', category: 'meals', amount_cents: 1560, created_by: 2, updated_at: '2026-01-05T10:00:00.000Z' },
  { title: 'Printer paper', category: 'office', amount_cents: 2450, created_by: 2, updated_at: '2026-01-06T10:00:00.000Z' },
  { title: 'Hotel booking', category: 'travel', amount_cents: 12400, created_by: 2, updated_at: '2026-01-07T10:00:00.000Z' },
  { title: 'Project dinner', category: 'meals', amount_cents: 9325, created_by: 2, updated_at: '2026-01-08T10:00:00.000Z' },
];

function passwordHash(password: string, salt: string): string {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const separator = storedHash.indexOf(':');
  if (separator < 0) return false;
  const salt = storedHash.slice(0, separator);
  const expectedHex = storedHash.slice(separator + 1);
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createDatabase(dbPath: string): DatabaseSync {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('viewer', 'editor'))
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id),
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

export function seed(dbPath: string): void {
  const db = createDatabase(dbPath);
  try {
    // Opt-in dedup state belongs to the fixture reset boundary.
    if (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'idempotency_keys'").get()) db.exec('DELETE FROM idempotency_keys');
    db.exec('DELETE FROM expenses; DELETE FROM users;');
    const insertUser = db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)');
    for (const user of users) insertUser.run(user.id, user.username, passwordHash(user.password, user.salt), user.role);
    const insertExpense = db.prepare(`
      INSERT INTO expenses (title, category, amount_cents, created_by, updated_at) VALUES (?, ?, ?, ?, ?)
    `);
    for (const expense of expenses) {
      insertExpense.run(expense.title, expense.category, expense.amount_cents, expense.created_by, expense.updated_at);
    }
  } finally {
    db.close();
  }
}

export function resetDatabase(dbPath: string): void {
  seed(dbPath);
}

export function findUser(db: DatabaseSync, username: string): User | undefined {
  return db.prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?').get(username) as User | undefined;
}

export function findExpense(db: DatabaseSync, id: number): Expense | undefined {
  return db.prepare('SELECT id, title, category, amount_cents, created_by, updated_at FROM expenses WHERE id = ?').get(id) as Expense | undefined;
}
