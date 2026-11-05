import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createServer, seed, type Defect } from '../src/server.js';

export interface RunningApp {
  baseUrl: string;
  dbPath: string;
  server: Server;
  login(role?: 'viewer' | 'editor'): Promise<string>;
  close(): Promise<void>;
  countByTitle(title: string): number;
  expenseAmount(id: number): number | undefined;
}

export async function startApp(defect: Defect | string | readonly Defect[] = ''): Promise<RunningApp> {
  const directory = await mkdtemp(join(tmpdir(), 'qab-expense-app-'));
  const dbPath = join(directory, 'fixture.sqlite');
  seed(dbPath);
  const server = createServer({ dbPath, defect });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected an ephemeral TCP port');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    dbPath,
    server,
    async login(role = 'editor') {
      const password = role === 'editor' ? 'editor-test-password' : 'viewer-test-password';
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        redirect: 'manual',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: role, password }),
      });
      const setCookie = response.headers.get('set-cookie');
      if (response.status !== 303 || !setCookie) throw new Error(`Login failed for ${role}: ${response.status}`);
      return setCookie.split(';')[0] ?? '';
    },
    async close() {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await rm(directory, { recursive: true, force: true });
    },
    countByTitle(title) {
      const db = new DatabaseSync(dbPath, { readOnly: true });
      try {
        return Number((db.prepare('SELECT COUNT(*) AS count FROM expenses WHERE title = ?').get(title) as { count: number }).count);
      } finally {
        db.close();
      }
    },
    expenseAmount(id) {
      const db = new DatabaseSync(dbPath, { readOnly: true });
      try {
        const row = db.prepare('SELECT amount_cents FROM expenses WHERE id = ?').get(id) as { amount_cents: number } | undefined;
        return row?.amount_cents;
      } finally {
        db.close();
      }
    },
  };
}

export function postForm(baseUrl: string, path: string, cookie: string, fields: Record<string, string>): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
  });
}
