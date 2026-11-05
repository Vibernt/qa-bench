import { describe, expect, it } from 'vitest';
import { check } from '../../../../lib/schemas.ts';
import { httpApi, PATHS, type SystemApi } from './client.ts';
import { isLocalApi, toCategory, toFinding, toRoute, toRunRequest, type RunStatus } from './map.ts';
import { runAdapter } from './run.ts';
import type { Brief } from './types.ts';

const brief: Brief = {
  episode_id: 'regression-001',
  bench_version: '0.1.0-b0',
  app: 'swag-labs',
  track: 'regression',
  targets: [{ name: 'swag-labs', url: 'http://127.0.0.1:40123/' }],
  roles: [{ role: 'customer', accounts: [{ username: 'customer-1', password: 'test-only-pass' }] }],
  budget: { wall_time_s: 60 },
  journeys: [{ id: 'login', title: 'Sign in', role: 'customer', steps: ['Sign in'] }],
};

function fakeApi(statuses: RunStatus['status'][], findings = [{ id: '1', url: 'http://127.0.0.1:40123/cart.html?x=1', kind: 'invariant', title: 'Total wrong', confidence: 0.9 }]) {
  const calls: string[] = [];
  let i = 0;
  const api: SystemApi = {
    startRun: async (req) => { calls.push(`start promote=${req.promote}`); return { id: 'r1' }; },
    getRun: async () => { calls.push('status'); const s = statuses[Math.min(i++, statuses.length - 1)]!; return { id: 'r1', status: s, cost: { model_usd: 0.12, compute_usd: 0.03 } }; },
    getFindings: async () => { calls.push('findings'); return findings; },
  };
  return { api, calls };
}

describe('http-api adapter mapping', () => {
  it('builds a run request that never promotes and carries the accounts', () => {
    const req = toRunRequest(brief, 'bench');
    expect(req.promote).toBe(false);
    expect(req.ephemeral).toBe(true);
    expect(req.accounts).toEqual([{ role: 'customer', username: 'customer-1', password: 'test-only-pass' }]);
    expect(req.external_id).toBe('regression-001');
    expect(req.journeys).toHaveLength(1);
  });

  it('maps categories, routes and findings into valid bench findings', () => {
    expect(toCategory('Accessibility')).toBe('a11y');
    expect(toCategory('perf.lcp')).toBe('perf');
    expect(toCategory('security-hygiene')).toBe('security-hygiene');
    expect(toCategory('weird')).toBe('functional');
    expect(toRoute('http://app:3000/inventory.html?sort=az#top')).toBe('/inventory.html');
    expect(toRoute(undefined)).toBe('*');
    const f = toFinding({ id: '7', url: 'http://app/x', kind: 'layout', title: 'Overlap', confidence: 3, detected_at: '2026-11-05T00:00:05Z' }, 0, Date.parse('2026-11-05T00:00:00Z'));
    expect(f).toMatchObject({ id: 'ts-7', category: 'visual', confidence: 1, detected_at_s: 5, where: { route: '/x' } });
  });

  it('treats only this machine as a local API', () => {
    expect(isLocalApi('http://127.0.0.1:8787')).toBe(true);
    expect(isLocalApi('http://localhost:8787')).toBe(true);
    expect(isLocalApi('https://qa-system.example.com')).toBe(false);
  });

  it('has no API call that promotes or approves anything', () => {
    const paths = [PATHS.start, PATHS.status('x'), PATHS.findings('x')].join(' ');
    expect(paths).not.toMatch(/promot|approv|baseline/i);
  });
});

describe('http-api adapter run', () => {
  const quick = { sleep: async () => {}, pollMs: 1 };

  it('refuses a remote system without approval, and does nothing', async () => {
    const { api, calls } = fakeApi(['done']);
    const r = await runAdapter(brief, { apiUrl: 'https://qa-system.example.com', makeApi: () => api, ...quick });
    expect(r.ok).toBe(false);
    expect(calls).toEqual([]);
    expect(r.findings.notes).toMatch(/go-ahead/);
    expect(check('findings', r.findings)).toEqual([]);
  });

  it('polls to completion and writes schema-valid findings with the system\'s reported cost', async () => {
    const { api, calls } = fakeApi(['queued', 'running', 'done']);
    const r = await runAdapter(brief, { apiUrl: 'http://127.0.0.1:8787', makeApi: () => api, ...quick });
    expect(r.ok).toBe(true);
    expect(calls).toEqual(['start promote=false', 'status', 'status', 'status', 'findings']);
    expect(r.findings.findings[0]).toMatchObject({ category: 'consistency', where: { route: '/cart.html' } });
    expect(r.findings.cost).toMatchObject({ model_usd: 0.12, compute_usd: 0.03 });
    expect(check('findings', r.findings)).toEqual([]);
  });

  it('stops at the budget and keeps the findings so far', async () => {
    const { api } = fakeApi(['running']);
    let t = 0;
    const r = await runAdapter(brief, { apiUrl: 'http://127.0.0.1:8787', makeApi: () => api, now: () => (t += 20_000), ...quick });
    expect(r.findings.notes).toMatch(/budget reached/);
    expect(r.findings.findings).toHaveLength(1);
  });

  it('names the system under test when told to', async () => {
    const { api } = fakeApi(['done']);
    const r = await runAdapter(brief, { apiUrl: 'http://127.0.0.1:8787', system: { name: 'acme-qa', version: '2.1' }, makeApi: () => api, ...quick });
    expect(r.findings.system).toEqual({ name: 'acme-qa', version: '2.1' });
  });

  it('reports a missing API URL without failing schema validation', async () => {
    const r = await runAdapter(brief, { makeApi: () => { throw new Error('not called'); } });
    expect(r.ok).toBe(false);
    expect(check('findings', r.findings)).toEqual([]);
  });

  it('sends the bearer token and never puts it in errors', async () => {
    const seen: Record<string, string>[] = [];
    const api = httpApi('http://127.0.0.1:8787/', 'secret-token-value', async (_url, init) => {
      seen.push(init?.headers ?? {});
      return { ok: false, status: 401, json: async () => ({}), text: async () => 'unauthorised' };
    });
    await expect(api.startRun(toRunRequest(brief))).rejects.toThrow(/HTTP 401/);
    await expect(api.startRun(toRunRequest(brief))).rejects.not.toThrow(/secret-token-value/);
    expect(seen[0]?.authorization).toBe('Bearer secret-token-value');
  });
});
