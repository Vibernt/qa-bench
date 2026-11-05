import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { check } from '../../../../lib/schemas.ts';
import { Collector, SYSTEM, buildFindingsFile, clip, writeFindingsFile } from '../src/findings.ts';
import { describeMonitor } from '../src/context.ts';
import { parseBrief, reserveMs, suiteFor } from '../src/run.ts';
import { pagesToVisit } from '../src/suites/generic.ts';
import { pickAccount, refused, totalMismatch } from '../src/suites/expense-app.ts';
import { arrive } from '../src/suites/swag-labs.ts';
import { gridProblems, inside, outliers, overlapArea, type CardGeometry } from '../src/layout.ts';
import adapter from '../adapter.json' with { type: 'json' };

const START = Date.parse('2026-11-05T10:00:00Z');

describe('Collector', () => {
  it('normalises routes, numbers ids and de-duplicates per check, route and selector (not role)', async () => {
    let now = START;
    const c = new Collector({ startedMs: START, now: () => now });
    now += 1500;
    const a = await c.add({ check: 'expense.total-equals-sum', category: 'consistency', route: 'http://app:3000/expenses?category=travel', role: 'viewer', selector: '[data-testid="total"]', description: 'total wrong', confidence: 0.95 });
    const dup = await c.add({ check: 'expense.total-equals-sum', category: 'consistency', route: '/expenses', role: 'editor', selector: '[data-testid="total"]', description: 'again', confidence: 0.9 });
    const b = await c.add({ check: 'page.broken-image', category: 'visual', route: '/x/', description: 'img', confidence: 2, region: { x: 1.4, y: 2.6, w: 10.2, h: -1 } });
    expect(dup).toBeUndefined();
    expect(c.findings).toHaveLength(2);
    expect(a?.id).toBe('pw-001-expense-total-equals-sum');
    expect(a?.where).toEqual({ route: '/expenses', role: 'viewer', selector: '[data-testid="total"]' });
    expect(a?.detected_at_s).toBe(1.5);
    expect(b?.id).toBe('pw-002-page-broken-image');
    expect(b?.where.route).toBe('/x');
    expect(b?.confidence).toBe(1);
    expect(b?.where.region).toEqual({ x: 1, y: 3, w: 10, h: 0 });
  });
  it('rejects categories outside the bench enum', () => {
    const c = new Collector({ startedMs: START });
    expect(() => c.addNow({ check: 'x', category: 'nonsense' as never, route: '/', description: 'd', confidence: 1 })).toThrow(/category/);
  });
  it('amends an earlier finding instead of filing a second', () => {
    const c = new Collector({ startedMs: START });
    c.addNow({ check: 'swag.layout-grid', key: 'k', category: 'visual', route: '/inventory.html', description: 'Image is wider', confidence: 0.7 });
    expect(c.amend('k', 'It is also a different picture', [{ kind: 'dom', excerpt: 'a vs b' }])).toBe(true);
    expect(c.amend('missing', 'x')).toBe(false);
    expect(c.findings[0]?.description).toBe('Image is wider. It is also a different picture');
    expect(c.findings[0]?.evidence).toHaveLength(1);
  });
  it('screenshots into the evidence dir and survives a failing screenshot', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'qab-pw-test-'));
    const c = new Collector({ startedMs: START, evidenceDir: dir });
    const ok = await c.add({ check: 'a', category: 'copy', route: '/', description: 'd', confidence: 0.5, page: { screenshot: async ({ path }) => { (await import('node:fs')).writeFileSync(path, 'png'); } } });
    const bad = await c.add({ check: 'b', category: 'copy', route: '/', description: 'd', confidence: 0.5, page: { screenshot: async () => { throw new Error('closed'); } } });
    expect(ok?.evidence?.[0]).toEqual({ kind: 'screenshot', path: 'pw-001-a.png' });
    expect(readdirSync(dir)).toEqual(['pw-001-a.png']);
    expect(bad?.evidence).toBeUndefined();
    expect(c.notes.join('\n')).toContain('screenshot for pw-002-b failed');
  });
});

describe('findings.json', () => {
  it('is valid against schemas/findings.schema.json, with and without findings', async () => {
    const c = new Collector({ startedMs: START });
    await c.add({
      check: 'swag.overview-item-total', category: 'consistency', route: 'http://app/checkout-step-two.html', role: 'customer', step: 'overview',
      selector: '[data-test="subtotal-label"]', region: { x: 0, y: 0, w: 10, h: 10, viewport: '1280x720' }, description: 'Item total wrong',
      evidence: [{ kind: 'dom', excerpt: 'x'.repeat(5000) }], confidence: 0.9, repro: ['a', 'b'],
    });
    for (const findings of [c.findings, []]) {
      const file = buildFindingsFile({ episodeId: 'regression-001', findings, notes: ['n'], startedAt: new Date(START), finishedAt: new Date(START + 12_345) });
      expect(check('findings', file)).toEqual([]);
      expect(file.system).toEqual(SYSTEM);
      expect(file.wall_time_s).toBe(12.3);
      expect(file.cost).toMatchObject({ compute_usd: 0, model_usd: 0 });
    }
    expect((c.findings[0]?.evidence?.[0]?.excerpt ?? '').length).toBeLessThanOrEqual(2000);
  });
  it('is written atomically', () => {
    const dir = mkdtempSync(join(tmpdir(), 'qab-pw-test-'));
    const path = join(dir, 'out', 'findings.json');
    writeFindingsFile(path, buildFindingsFile({ episodeId: 'e', findings: [], notes: [], startedAt: new Date(START), finishedAt: new Date(START) }));
    expect(JSON.parse(readFileSync(path, 'utf8')).episode_id).toBe('e');
    expect(readdirSync(join(dir, 'out'))).toEqual(['findings.json']);
  });
  it('describes monitor findings in plain words', () => {
    expect(describeMonitor('resource-status', '/a', 2, 'image /x.jpg returned HTTP 404')).toBe('2 failed same-origin resources on /a: image /x.jpg returned HTTP 404');
    expect(describeMonitor('pageerror', '/a', 1, 'TypeError:\n  at x')).toBe('1 uncaught JavaScript exception on /a: TypeError: at x');
  });
  it('clips long text', () => {
    expect(clip('abcdef', 4)).toBe('abc…');
    expect(clip('abc', 4)).toBe('abc');
  });
});

describe('manifest and brief handling', () => {
  it('has a valid adapter.json', () => {
    expect(check('adapter', adapter)).toEqual([]);
    expect(adapter).toMatchObject({ name: 'playwright-suite', mode: 'container', build: 'Dockerfile', network: 'episode', version: SYSTEM.version });
  });
  it('picks the suite by app, generic otherwise', () => {
    expect(suiteFor('expense-app').name).toBe('expense-app');
    expect(suiteFor('swag-labs').name).toBe('swag-labs');
    expect(suiteFor('the-internet').name).toBe('the-internet');
    expect(suiteFor('ghost').name).toBe('generic');
  });
  it('rejects unusable briefs', () => {
    expect(() => parseBrief('not json')).toThrow();
    expect(() => parseBrief('{"episode_id":"e","targets":[],"roles":[],"budget":{"wall_time_s":10}}')).toThrow(/targets/);
    expect(parseBrief('{"episode_id":"e","targets":[{"name":"a","url":"http://app/"}],"roles":[],"budget":{"wall_time_s":10}}').episode_id).toBe('e');
  });
  it('keeps a reserve at the end of the budget', () => {
    expect(reserveMs(10)).toBe(2000);
    expect(reserveMs(100)).toBe(10_000);
    expect(reserveMs(3600)).toBe(20_000);
  });
  it('visits brief pages on the targets only, else the targets', () => {
    const targets = [{ url: 'https://site.example/start' }];
    expect(pagesToVisit(targets, ['/', '/about', 'https://elsewhere.example/x', '/about'])).toEqual(['https://site.example/', 'https://site.example/about']);
    expect(pagesToVisit(targets, undefined)).toEqual(['https://site.example/start']);
    expect(pagesToVisit([], ['/'])).toEqual([]);
  });
});

describe('expense-app helpers', () => {
  it('compares the total with the rows', () => {
    expect(totalMismatch({ rows: [{ amount: 42.5 }, { amount: 68.4 }], total: 110.9 })).toBeUndefined();
    expect(totalMismatch({ rows: [{ amount: 42.5 }, { amount: 68.4 }], total: 42.5 })).toContain('$110.90');
    expect(totalMismatch({ rows: [], total: undefined })).toBe('no total is shown');
  });
  it('knows a refusal', () => {
    expect(refused(403, undefined)).toBe(true);
    expect(refused(303, '/login')).toBe(true);
    expect(refused(303, '/expenses?flash=updated')).toBe(false);
    expect(refused(200, undefined)).toBe(false);
  });
  it('picks accounts by role name', () => {
    const roles = [{ role: 'viewer', accounts: [{ username: 'v', password: 'p' }] }, { role: 'approver-editor', accounts: [{ username: 'e', password: 'q' }] }];
    expect(pickAccount(roles, 'viewer', /view/)).toEqual({ role: 'viewer', username: 'v', password: 'p' });
    expect(pickAccount(roles, 'editor', /edit/)?.role).toBe('approver-editor');
    expect(pickAccount(roles, 'admin', /admin/)).toBeUndefined();
  });
});

describe('layout geometry', () => {
  it('finds outliers against a clear majority only', () => {
    expect(outliers([171, 171, 260, 235, 171, 171])).toEqual([{ index: 2, value: 260, mode: 171 }, { index: 3, value: 235, mode: 171 }]);
    expect(outliers([171, 172, 171])).toEqual([]);
    expect(outliers([1, 2, 3, 4])).toEqual([]);
    expect(outliers([5, 5])).toEqual([]);
  });
  it('boxes', () => {
    expect(inside({ x: 1, y: 1, w: 5, h: 5 }, { x: 0, y: 0, w: 10, h: 10 })).toBe(true);
    expect(inside({ x: 1034, y: 39, w: 42, h: 42 }, { x: 0, y: 0, w: 1280, h: 57 })).toBe(false);
    expect(overlapArea({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(25);
    expect(overlapArea({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(0);
  });
  it('flags a shifted part and a part sticking out of its card, once per element', () => {
    const card = (bx: number, nameX: number): CardGeometry => ({
      card: { x: 0, y: 0, w: 505, h: 240 },
      parts: {
        nameText: { selector: '[data-test="inventory-item-name"]', rel: { x: nameX, y: 21, w: 200, h: 20 } },
        button: { selector: `[data-test="btn-${bx}"]`, rel: { x: bx, y: 185, w: 160, h: 34 } },
      },
    });
    const cards = [card(310, 171), card(310, 171), card(310, 260), card(310, 171), card(364, 171), card(310, 171)];
    const problems = gridProblems(cards);
    expect(problems.map((p) => [p.kind, p.selector])).toEqual([['grid', '[data-test="inventory-item-name"]'], ['grid', '[data-test="btn-364"]']]);
    expect(gridProblems(cards.map(() => card(310, 171)))).toEqual([]);
  });
  it('exports the page-arrival helper', () => {
    expect(typeof arrive).toBe('function');
  });
});
