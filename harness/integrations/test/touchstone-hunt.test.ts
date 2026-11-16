import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { runHuntSet } from '../touchstone-hunt/loop.ts';
import { HuntFailure, type NativeResult } from '../../adapters/touchstone-hunt/src/native.ts';
import { brief } from '../../adapters/touchstone-hunt/test/fixtures.ts';
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'qa-bench-hunt-set-')); dirs.push(dir);
  const up = vi.fn(async (id: string) => ({ session: { brief: `${id}.json`, findings: `${id}/out.json` }, brief: brief() }));
  const hunt = vi.fn(async (_session: { brief: string; findings: string }, _cap: number): Promise<NativeResult> => ({ planOnly: false, cost: { model_usd: 0.5, calls: 2, tokens: 40, wall_seconds: 1 } }));
  const down = vi.fn(async (_dir: string) => {});
  const status = (id: string) => JSON.parse(readFileSync(join(dir, id, 'runner.json'), 'utf8'));
  return { dir, up, hunt, down, status };
}
const opts = { maxUsd: 1, totalUsd: 1, live: true };
it('stops at total cap, records skipped episodes and scores completed episodes', async () => {
  const f = fixture(); const result = await runHuntSet(['one', 'two', 'three'], f.dir, opts, f);
  expect(result.completed).toBe(2); expect(f.up).toHaveBeenCalledTimes(2); expect(f.status('three').status).toBe('skipped');
  expect(f.hunt.mock.calls.map(c => c[1])).toEqual([1, 0.5]);
  expect(result.cost.total).toMatchObject({ model_usd: 1, calls: 4, tokens: 80, reserved_usd: 1 });
  expect(JSON.parse(readFileSync(join(f.dir, 'cost.json'), 'utf8'))).toEqual(result.cost);
});
it('episode failure does not abort set, retains redacted reason and measured paid usage', async () => {
  const f = fixture(); f.hunt.mockRejectedValueOnce(new HuntFailure('private-user private-password failed', { model_usd: 0.1, calls: 1, tokens: 20, wall_seconds: 1 }));
  const result = await runHuntSet(['one', 'two'], f.dir, opts, f);
  expect(result.completed).toBe(1); expect(f.status('one')).toMatchObject({ status: 'adapter_error', status_reason: '[masked] [masked] failed' });
  expect(f.status('two').status).toBe('scored'); expect(f.down).toHaveBeenCalledTimes(2);
  expect(result.cost.total.model_usd).toBeCloseTo(0.6); expect(f.hunt.mock.calls[1]![1]).toBeCloseTo(0.9);
});
it('unknown failure reserves full episode ceiling, preserves unknown totals and stops at set cap', async () => {
  const f = fixture(); f.hunt.mockRejectedValueOnce(new Error('CLI failed without usage'));
  const result = await runHuntSet(['one', 'two', 'three'], f.dir, { ...opts, totalUsd: 1.5 }, f);
  expect(f.hunt.mock.calls.map(c => c[1])).toEqual([1, 0.5]); expect(result.completed).toBe(1);
  expect(result.cost.total).toMatchObject({ model_usd: null, calls: null, tokens: null, reserved_usd: 1.5 });
  expect(f.status('three').status).toBe('skipped');
});
it('continues startup and teardown failures, never tears down an unreturned session', async () => {
  const f = fixture(); f.up.mockRejectedValueOnce(new Error('Startup refused')); f.down.mockRejectedValueOnce(new Error('Cleanup private-password'));
  const r = await runHuntSet(['one', 'two', 'three'], f.dir, { ...opts, totalUsd: 3 }, f);
  expect(r.completed).toBe(1); expect(f.down.mock.calls.map(c => c[0])).toEqual([join(f.dir, 'two'), join(f.dir, 'three')]);
  expect(f.status('two').status_reason).toBe('Teardown failed: Cleanup [masked]');
});
it('plan-only processes entire set with skipped scoring status and zero model usage', async () => {
  const f = fixture(); f.hunt.mockResolvedValue({ planOnly: true, cost: { model_usd: 0, calls: 0, tokens: 0, wall_seconds: 1 } });
  const r = await runHuntSet(['one', 'two'], f.dir, { ...opts, live: false }, f);
  expect(f.hunt).toHaveBeenCalledTimes(2); expect(r.completed).toBe(0); expect(f.status('one').status).toBe('skipped');
  expect(r.cost.total).toMatchObject({ model_usd: 0, calls: 0, tokens: 0 });
});
it('accounts over-cap usage as an error and stops further launches', async () => {
  const f = fixture(); f.hunt.mockResolvedValue({ planOnly: false, cost: { model_usd: 2, calls: 2, tokens: 20, wall_seconds: 1 } });
  const r = await runHuntSet(['one', 'two'], f.dir, opts, f);
  expect(r.completed).toBe(0); expect(f.status('one').status_reason).toContain('above reserved'); expect(f.up).toHaveBeenCalledOnce();
});
