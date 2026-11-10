import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import type { Brief, FindingsFile } from '../../../lib/contracts.ts';
import { runEpisodes } from '../src/episode-loop.ts';

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'qa-bench-loop-')); dirs.push(dir);
  const brief: Brief = { episode_id: 'test-001', bench_version: 'test', app: 'test', track: 'visual',
    targets: [{ name: 'app', url: 'http://127.0.0.1:1234' }], roles: [{ role: 'editor', accounts: [{ username: 'private-user', password: 'private-password' }] }], budget: { wall_time_s: 60 } };
  const up = vi.fn(async (id: string) => ({ session: { brief: id, findings: `${id}.json` }, brief }));
  const checks = vi.fn(async (): Promise<FindingsFile> => ({ episode_id: 'test-001', system: { name: 'test', version: '1' }, findings: [], wall_time_s: 2 }));
  const down = vi.fn(async (_dir: string) => {});
  const status = (id: string) => JSON.parse(readFileSync(join(dir, id, 'runner.json'), 'utf8'));
  return { dir, up, checks, down, status };
}
it('retains redacted real adapter errors, tears down and scores later episodes', async () => {
  const f = fixture();
  f.checks.mockRejectedValueOnce(new Error('Unsupported form for private-user with private-password'));
  expect(await runEpisodes(['one', 'two', 'three'], f.dir, f)).toBe(2);
  expect(f.status('one')).toMatchObject({ status: 'adapter_error', status_reason: 'Unsupported form for [masked] with [masked]' });
  expect(f.status('two')).toMatchObject({ status: 'scored', wall_time_s: 2 });
  expect(f.status('three').status).toBe('scored');
  expect(f.down.mock.calls.map(([dir]) => dir)).toEqual(['one', 'two', 'three'].map(id => join(f.dir, id)));
});
it('attempts every episode when all adapters fail and returns zero completions', async () => {
  const f = fixture(); f.checks.mockRejectedValue(new Error('Collector failed'));
  expect(await runEpisodes(['one', 'two'], f.dir, f)).toBe(0);
  expect(f.checks).toHaveBeenCalledTimes(2);
  expect(f.down).toHaveBeenCalledTimes(2);
  expect(f.status('two').status_reason).toBe('Collector failed');
});
it('continues after startup failure and tears down only returned sessions', async () => {
  const f = fixture(); f.up.mockRejectedValueOnce(new Error('Image unavailable'));
  expect(await runEpisodes(['one', 'two'], f.dir, f)).toBe(1);
  expect(f.status('one').status_reason).toBe('Image unavailable');
  expect(f.down).toHaveBeenCalledExactlyOnceWith(join(f.dir, 'two'));
});
it('preserves both check and teardown errors and continues after teardown failure', async () => {
  const f = fixture();
  f.checks.mockRejectedValueOnce(new Error('Original failure private-password'));
  f.down.mockRejectedValueOnce(new Error('Cleanup failed private-user'));
  expect(await runEpisodes(['one', 'two'], f.dir, f)).toBe(1);
  expect(f.status('one').status_reason).toBe('Original failure [masked]\nTeardown failed: Cleanup failed [masked]');
  expect(f.status('two').status).toBe('scored');
});
it('records teardown failure after successful checks and continues', async () => {
  const f = fixture(); f.down.mockRejectedValueOnce(new Error('Cleanup failed'));
  expect(await runEpisodes(['one', 'two'], f.dir, f)).toBe(1);
  expect(f.status('one').status_reason).toBe('Teardown failed: Cleanup failed');
});
