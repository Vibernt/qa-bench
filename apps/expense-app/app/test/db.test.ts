import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, expect, it } from 'vitest';
import { createDatabase, resetDatabase, seed } from '../src/db.js';

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

it('creates, seeds, and resets the fixture database', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'qab-expense-db-'));
  directories.push(directory);
  const dbPath = join(directory, 'fixture.sqlite');
  createDatabase(dbPath).close();
  seed(dbPath);

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    expect((db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count).toBe(2);
    expect((db.prepare('SELECT COUNT(*) AS count FROM expenses').get() as { count: number }).count).toBe(8);
  } finally {
    db.close();
  }

  resetDatabase(dbPath);
  const resetDb = new DatabaseSync(dbPath, { readOnly: true });
  try {
    expect((resetDb.prepare('SELECT COUNT(*) AS count FROM expenses').get() as { count: number }).count).toBe(8);
  } finally {
    resetDb.close();
  }
});
