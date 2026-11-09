import { afterEach, expect, it, vi } from 'vitest';
import { rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LIMITS, MODELS, nanoCost, RunBudget } from '../src/pricing.ts';
import { planRun, runJudge, sdkTransport, type JudgeTransport } from '../src/run.ts';
import { fixtureSet } from './helpers.ts';
import type { JudgeRun } from '../src/types.ts';
const dirs: string[] = [];
afterEach(() => { dirs.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function fake(): JudgeTransport {
  return { count: vi.fn(async () => 100), create: vi.fn(async () => ({ id: 'message', model: 'measured-model', stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify({ outcome: 'problem', confidence: .99, probabilities: { problem: .99, ok: .01, unsure: 0 }, reason: 'Button overlaps footer' }) }],
    usage: { input_tokens: 100, output_tokens: 50 } })) };
}
it('uses dated per-model pricing and exact integer cap boundaries', () => {
  for (const model of Object.keys(MODELS) as (keyof typeof MODELS)[]) {
    const cost = nanoCost(model, LIMITS.input, LIMITS.output);
    const b = new RunBudget(cost / 1e9);
    expect(b.reserve(cost)).toBe(true); expect(b.reserve(1)).toBe(false);
    b.settle(cost, 0); expect(b.reserve(cost)).toBe(true);
  }
  for (const cap of [0, -1, NaN, Infinity]) expect(() => new RunBudget(cap)).toThrow();
});
it('dry-run validates evidence and plans exact maxima without a key or any network', () => {
  const f = fixtureSet(); dirs.push(f.root);
  vi.stubEnv('ANTHROPIC_API_KEY', '');
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Network forbidden'); }));
  const p = planRun(f.manifest, 'claude-opus-5-5', 1);
  expect(p.messages_calls).toBe(2);
  expect(p.max_cost_usd).toBe(nanoCost('claude-opus-5-5', 16384, 1024) * 2 / 1e9);
  expect(fetch).not.toHaveBeenCalled();
});
it('reserves before each call and stops before an unaffordable first call', async () => {
  const f = fixtureSet(); dirs.push(f.root); const gateway = fake();
  const r = await runJudge(f.manifest, 'claude-opus-5-5', .000001, join(f.root, 'run.json'), gateway);
  expect(r.status).toBe('budget_stopped'); expect(gateway.count).not.toHaveBeenCalled(); expect(gateway.create).not.toHaveBeenCalled();
});
it('meters each real response and releases only the unused reservation', async () => {
  const f = fixtureSet(); dirs.push(f.root); const gateway = fake();
  const r = await runJudge(f.manifest, 'claude-haiku-5-5', 1, join(f.root, 'run.json'), gateway);
  expect(r.status).toBe('complete'); expect(r.calls).toHaveLength(2);
  expect(r.calls[0]!.cost_usd).toBe(nanoCost('claude-haiku-5-5', 100, 50) / 1e9);
  expect(r.calls[0]!.response_model).toBe('measured-model');
});
it('retains an ambiguous failed reservation, sanitizes provider errors and never retries', async () => {
  const f = fixtureSet(); dirs.push(f.root); const gateway = fake();
  gateway.create = vi.fn(async () => { throw new Error('secret-key-and-provider-details'); });
  const output = join(f.root, 'run.json');
  await expect(runJudge(f.manifest, 'claude-sonnet-5-5', 1, output, gateway)).rejects.toThrow('details withheld');
  expect(gateway.create).toHaveBeenCalledTimes(1);
  const bytes = readFileSync(output, 'utf8'); expect(bytes).not.toContain('secret-key');
  const run = JSON.parse(bytes) as JudgeRun;
  expect(run.calls[0]!.cost_usd).toBeNull(); expect(run.calls[0]!.reserved_usd).toBeGreaterThan(0);
});
it('records over-ceiling input as not judged and never generates', async () => {
  const f = fixtureSet(); dirs.push(f.root); const gateway = fake();
  gateway.count = async () => LIMITS.input + 1;
  const r = await runJudge(f.manifest, 'claude-haiku-5-5', 1, join(f.root, 'run.json'), gateway);
  expect(r.calls.every(c => c.status === 'not_judged')).toBe(true);
  expect(gateway.create).not.toHaveBeenCalled();
});
it('uses the official SDK at the fixed first-party URL with retries disabled', async () => {
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-key-never-live');
  vi.stubEnv('ANTHROPIC_BASE_URL', 'https://unapproved.invalid');
  const request = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ type: 'error', error: { type: 'rate_limit_error', message: 'Limited' } }), {
    status: 429, headers: { 'content-type': 'application/json' },
  }));
  vi.stubGlobal('fetch', request);
  const gateway = sdkTransport();
  await expect(gateway.create({ model: 'claude-haiku-5-5', max_tokens: 1, messages: [{ role: 'user', content: 'test' }] })).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(1);
  const input = request.mock.calls[0]![0];
  expect(input instanceof Request ? input.url : String(input)).toContain('https://api.anthropic.com');
});
it('accepts no alternative credential environment variable', () => {
  vi.stubEnv('ANTHROPIC_API_KEY', ''); vi.stubEnv('ANTHROPIC_AUTH_TOKEN', 'alternative-credential');
  expect(() => sdkTransport()).toThrow('ANTHROPIC_API_KEY');
});
it('records malformed paid responses as invalid, never as an ok or a replacement call', async () => {
  const f = fixtureSet(1); dirs.push(f.root); const gateway = fake();
  gateway.create = vi.fn(async () => ({ id: 'invalid', model: 'test', stop_reason: 'max_tokens', content: [{ type: 'text', text: '{' }], usage: { input_tokens: 100, output_tokens: 50 } }));
  const run = await runJudge(f.manifest, 'claude-haiku-5-5', 1, join(f.root, 'run.json'), gateway);
  expect(run.calls[0]!.status).toBe('invalid_output'); expect(run.calls[0]!.answer).toBeNull();
  expect(run.calls[0]!.cost_usd).toBeGreaterThan(0); expect(gateway.create).toHaveBeenCalledTimes(1);
});
it('never overwrites a prior run journal', async () => {
  const f = fixtureSet(); dirs.push(f.root);
  await expect(runJudge(f.manifest, 'claude-haiku-5-5', 1, f.manifest, fake())).rejects.toThrow('already exists');
});
it('records a case over the input ceiling as not judged and never sends it', async () => {
  const f = fixtureSet(); dirs.push(f.root);
  const t = fake(); let n = 0; t.count = vi.fn(async () => (n++ === 0 ? LIMITS.input + 1 : 100));
  const out = join(f.root, 'oversize.json');
  const run = await runJudge(f.manifest, 'claude-haiku-5-5', 1, out, t);
  expect(run.calls[0]).toMatchObject({ status: 'not_judged', cost_usd: 0, answer: null });
  expect(run.calls[1]!.status).toBe('answered');
  expect(t.create).toHaveBeenCalledTimes(1);
});
