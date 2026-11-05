import { mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { seed } from '../src/db.js';

describe('server entry point', () => {
  it('starts when launched through a symlinked path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'expense-entry-'));
    const dbPath = join(dir, 'app.db'); seed(dbPath);
    const real = fileURLToPath(new URL('../dist/server.js', import.meta.url));
    const link = join(dir, 'server-link.js'); symlinkSync(real, link);
    const child = spawn(process.execPath, [link], { env: { ...process.env, PORT: '0', DB_PATH: dbPath }, stdio: ['ignore', 'pipe', 'pipe'] });
    try {
      const line = await new Promise<string>((ok, fail) => {
        child.stdout.on('data', d => { const s = String(d); if (s.includes('LISTENING')) ok(s.trim()); });
        child.on('exit', code => fail(new Error(`exited before readiness (code ${code})`)));
      });
      expect(line).toMatch(/^LISTENING \d+$/);
    } finally { child.kill(); }
  });
});
