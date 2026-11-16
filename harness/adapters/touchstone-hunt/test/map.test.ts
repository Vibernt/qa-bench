import { expect, it } from 'vitest';
import { convertHunt, routePath } from '../src/map.ts';
import { cleanJson } from '../src/privacy.ts';
import { meter } from '../src/contract.ts';
import { brief, result, usage } from './fixtures.ts';
it('maps every bench field and redacts all claim text, evidence references and reproduction', () => {
  const mapped = convertHunt(brief(), result(), usage(), 2, 'version');
  expect(mapped).toMatchObject({ episode_id: 'test-001', system: { name: 'touchstone-hunt-hunt-0.2', version: 'version' }, wall_time_s: 2, cost: { model_usd: 0.01 } });
  expect(mapped.findings).toEqual([{ id: 'hunt-1:observation-1', where: { route: '/expenses', role: 'editor' }, category: 'consistency', severity: 'major', confidence: 0.5,
    description: '[masked] total mismatch\nExpected: Sum of all rows\nActual: [masked] wrong total', repro: ['Open expenses', 'Compare [masked] rows'], check: 'hunt-0.2:issue',
    evidence: [{ kind: 'text', excerpt: 'claimed; OBSERVATION_CLAIMED', note: 'Model claim; confidence 0.5 is an uncalibrated adapter constant.' },
      { kind: 'other', note: 'Source evidence reference (not a downloaded bench artifact): capture:[masked]' }] }]);
  expect(JSON.stringify(mapped)).not.toContain('private-');
});
it.each([[1, 'minor'], [2, 'minor'], [3, 'major'], [4, 'major'], [5, 'critical']] as const)('maps severity %s to %s', (severity, expected) => {
  const data = result(); data.observations![0]!.severity = severity;
  expect(convertHunt(brief(), data, usage(), 1, 'v').findings[0]!.severity).toBe(expected);
});
it('preserves warnings and missing captures with explicit unknown routes and no invented artifact path', () => {
  const data = result(); const o = data.observations![0]!;
  o.class = 'warning'; o.path = null; o.evidence = null; o.evidenceRefs = []; o.reason = 'EVIDENCE_UNAVAILABLE';
  const finding = convertHunt(brief(), data, usage(), 1, 'v').findings[0]!;
  expect(finding.where.route).toBe('*'); expect(finding.check).toBe('hunt-0.2:warning');
  expect(finding.evidence).toHaveLength(1); expect(finding.evidence![0]!.excerpt).toContain('EVIDENCE_UNAVAILABLE');
  expect(finding.evidence![0]).not.toHaveProperty('path');
});
it.each(['/a/../expenses?q=1#x', 'http://127.0.0.1:1234/expenses?q=1', '/expenses'])('normalises %s', path => {
  expect(routePath(path, brief())).toBe('/expenses');
});
it('rejects outside origins and unsupported roles, categories, severities, cleanup', () => {
  expect(() => routePath('//example.test/x', brief())).toThrow('outside');
  for (const mutate of [
    (d: ReturnType<typeof result>) => { d.observations![0]!.role = 'unknown'; },
    (d: ReturnType<typeof result>) => { Object.assign(d.observations![0]!, { category: 'unknown' }); },
    (d: ReturnType<typeof result>) => { Object.assign(d.observations![0]!, { severity: 6 }); },
    (d: ReturnType<typeof result>) => { d.cleanup = 'unconfirmed'; },
  ]) { const d = result(); mutate(d); expect(() => convertHunt(brief(), d, usage(), 1, 'v')).toThrow(); }
});
it('maps confirmed candidate details and observed replay route, excludes unconfirmed candidates', () => {
  const d = result(); const o = d.observations![0]!; d.observations = [];
  d.candidates = [{ id: 'candidate-1', summary: o.title, role: o.role, template: o.template, details: o,
    status: 'finding', reason: 'REPRODUCED', replays: [{ context: { finalUrl: 'http://127.0.0.1:1234/expenses?x=1' }, evidenceRefs: ['receipt'] }] }];
  expect(convertHunt(brief(), d, usage(), 1, 'v').findings[0]).toMatchObject({ id: 'hunt-1:candidate-1', where: { route: '/expenses' } });
  d.candidates[0]!.status = 'unconfirmed'; expect(convertHunt(brief(), d, usage(), 1, 'v').findings).toEqual([]);
});
it('preserves unknown model cost and token counts rather than reporting zero', () => {
  const u = usage(); u.totals.costUSD = null; u.totals.inputTokens = null;
  expect(convertHunt(brief(), result(), u, 1, 'v').cost).not.toHaveProperty('model_usd');
  expect(meter(u, 2)).toEqual({ model_usd: null, calls: 2, tokens: null, wall_seconds: 2 });
  u.totals.costUSD = -1; expect(() => meter(u, 2)).toThrow('Invalid');
});
it('redacts quoted credentials as values without damaging JSON and masks paths and bearer tokens', () => {
  const b = brief(); b.roles[0]!.accounts[0]!.password = '"';
  expect(cleanJson({ description: 'quote " /Users/someone/file Bearer abc' }, b)).toEqual({ description: 'quote [masked] [private-path] Bearer [masked]' });
});

it('gives claims unique bench IDs even when upstream model IDs repeat across roles or lenses', () => {
  const d = result(); d.observations!.push({ ...d.observations![0]!, title: 'Another claim' });
  expect(convertHunt(brief(), d, usage(), 1, 'v').findings.map(f => f.id)).toEqual(['hunt-1:observation-1', 'hunt-2:observation-1']);
});
it('refuses malformed missing/empty routes; only an explicit null means unknown', () => {
  for (const path of ['', undefined]) expect(() => routePath(path as string, brief())).toThrow('Invalid observed route');
});
