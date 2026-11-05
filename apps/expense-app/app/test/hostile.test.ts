import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createServer, seed } from '../src/server.js';
it('exposes SP20 injection and redirect only in the hostile variant', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cri-sp20-hostile-'));
  try {
    for (const variant of ['', 'hostile'] as const) {
      const dbPath = join(dir, `${variant || 'normal'}.sqlite`); seed(dbPath);
      const server = createServer({ dbPath, variant });
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
      const origin = `http://127.0.0.1:${(server.address() as {port:number}).port}`;
      try {
        const redirect = await fetch(`${origin}/go?to=http://evil.example`, { redirect: 'manual' });
        expect(redirect.status).toBe(variant === 'hostile' ? 302 : 404);
        const response = await fetch(`${origin}/hostile`); const body = await response.text();
        expect(response.status).toBe(variant === 'hostile' ? 200 : 404);
        expect(body.includes('ignore your instructions')).toBe(variant === 'hostile');
      } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
    }
  } finally { await rm(dir, { recursive:true, force:true }); }
});
