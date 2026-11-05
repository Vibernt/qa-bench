import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Brief } from '../../../lib/contracts.ts';
import { check } from '../../../lib/schemas.ts';
import { AGENTS_ROOT, EXPLORATORY_NOTE, HARNESS_VERSION, briefSummary, estimateCost, evidencePath, loadConfigs, loadSet, modeNote, renderPrompt, sanitiseFindings } from '../src/index.ts';

const brief: Brief = {
  episode_id: 'regression-003', bench_version: '0.1.0-b0', app: 'expense-app', track: 'regression', mode: 'regression',
  purpose: 'An expense tracker for a small team.',
  targets: [{ name: 'expense-app', url: 'http://127.0.0.1:40001/expenses' }],
  roles: [{ role: 'viewer', accounts: [{ username: 'viewer-1a2b', password: 'pw-test-only' }] }],
  budget: { wall_time_s: 600 },
  journeys: [{ id: 'expense.list', title: 'View the list', role: 'viewer', start: '/expenses', steps: ['Sign in', 'Open the list'] }],
  categories: ['functional', 'consistency'],
};
const sys = { name: 'claude-haiku-5.5-low', version: 'claude-haiku-5-5@low' };

describe('configs and sets', () => {
  it('every config has a driver, a model and a price; ids are unique', () => {
    const cs = loadConfigs();
    expect(new Set(cs.map((c) => c.id)).size).toBe(cs.length);
    for (const c of cs) {
      expect(c.driver).toBeTruthy();
      expect(c.model).toMatch(/^claude-/);
      expect(c.price?.input).toBeGreaterThan(0);
    }
  });
  it('the sample set has 10 distinct episodes', () => {
    const s = loadSet('b0-sample-10');
    expect(new Set(s.episodes).size).toBe(10);
  });
});

describe('prompt', () => {
  const tpl = readFileSync(join(AGENTS_ROOT, 'prompt.md'), 'utf8');
  const render = (b: Brief) => renderPrompt(tpl, {
    workdir: '/tmp/w', findings: '/tmp/w/findings.json', episode_id: b.episode_id, mode_note: modeNote(b), brief_summary: briefSummary(b),
    budget_minutes: '10', system_name: sys.name, system_version: sys.version,
  });

  it('renders every placeholder and carries only brief facts', () => {
    const out = render(brief);
    expect(out).not.toMatch(/\{\{\w+\}\}/);
    expect(out).toContain('viewer-1a2b');
    expect(out).toContain('http://127.0.0.1:40001/expenses');
    expect(out).not.toMatch(/mutations\/|label\.yaml|answer-key|DEFECT=/);
  });

  it('regression prompts list the journeys and the purpose, with no exploratory note', () => {
    const out = render(brief);
    expect(out).toContain('- What it is: An expense tracker for a small team.');
    expect(out).toContain('Journeys to cover');
    expect(out).not.toContain(EXPLORATORY_NOTE);
    expect(out).toContain('## The brief\n- App: expense-app');
  });

  it('exploratory prompts say there is no checklist and show the purpose', () => {
    const { journeys: _j, ...rest } = brief;
    const out = render({ ...rest, mode: 'exploratory', episode_id: 'exploration-001', track: 'exploration' });
    expect(out).not.toMatch(/\{\{\w+\}\}/);
    expect(out).toContain('No checklist is given: find what is broken before release');
    expect(out).toContain('- What it is: An expense tracker for a small team.');
    expect(out).not.toContain('Journeys to cover');
    expect(HARNESS_VERSION).toBe('0.3.0');
  });
});

describe('sanitiseFindings', () => {
  it('drops unknown fields and unrepairable findings, repairs URLs, and validates', () => {
    const raw = {
      episode_id: 'wrong', extra: 1,
      findings: [
        { id: 'a', where: { route: 'http://127.0.0.1:40001/expenses?category=meals', role: 'viewer', junk: true }, category: 'Consistency', description: ' Total wrong ', confidence: 3, severity: 'major' },
        { id: 'a', where: { route: '/x' }, category: 'nonsense', description: 'dropped' },
        { where: {}, category: 'copy', description: 'no route' },
      ],
      notes: 'ok',
    };
    const { file, dropped, repaired } = sanitiseFindings(raw, 'regression-003', sys);
    expect(dropped).toBe(1);
    expect(repaired).toBe(1);
    expect(file.episode_id).toBe('regression-003');
    expect(file.findings[0]).toMatchObject({ id: 'a', where: { route: '/expenses', role: 'viewer' }, category: 'consistency', description: 'Total wrong', confidence: 1 });
    expect(file.findings[1]?.where.route).toBe('*');
    expect(check('findings', file)).toEqual([]);
  });
  it('makes evidence paths relative to the evidence directory', () => {
    expect(evidencePath('/tmp/qa-bench-agents/s/regression-003/evidence/f1.png')).toBe('f1.png');
    expect(evidencePath('evidence/sub/f2.png')).toBe('sub/f2.png');
    expect(evidencePath('./f3.png')).toBe('f3.png');
    expect(evidencePath('/somewhere/else/f4.png')).toBe('f4.png');
    const { file } = sanitiseFindings({ findings: [{ id: 'a', where: { route: '/' }, category: 'functional', description: 'x', evidence: [{ kind: 'screenshot', path: '/w/ep/evidence/a.png' }] }] }, 'regression-003', sys);
    expect(file.findings[0]?.evidence).toEqual([{ kind: 'screenshot', path: 'a.png' }]);
  });
  it('turns garbage into a valid empty file', () => {
    const { file } = sanitiseFindings('nope', 'noise-001', sys);
    expect(file.findings).toEqual([]);
    expect(check('findings', file)).toEqual([]);
  });
});

describe('estimateCost', () => {
  const price = { input: 2, output: 10, cache_read: 0.2 };
  it('is exact with a token split', () => {
    expect(estimateCost({ input_tokens: 1e6, output_tokens: 1e5, cache_read_tokens: 1e6 }, price).usd).toBeCloseTo(2 + 1 + 0.2);
  });
  it('blends a total and states the range', () => {
    const r = estimateCost({ total_tokens: 1e6 }, price);
    expect(r.usd).toBeCloseTo(0.85 * 0.2 + 0.1 * 2 + 0.05 * 10);
    expect(r.note).toMatch(/range/);
  });
});
