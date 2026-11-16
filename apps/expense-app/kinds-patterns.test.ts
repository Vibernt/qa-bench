import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadApps } from '../../harness/generator/src/apps.ts';
import { matchFinding } from '../../scorer/src/matcher.ts';
import { scoreEpisode } from '../../scorer/src/score.ts';
import { buildReport, renderMarkdown } from '../../scorer/src/report.ts';
import { check } from '../../lib/schemas.ts';
import { aggregate } from '../../scorer/src/metrics.ts';
import { episode, finding } from '../../scorer/test/helpers.ts';
import type { Label } from '../../lib/contracts.ts';

const app = loadApps().get('expense-app')!;
const labels = [...app.mutations, ...app.changes, ...app.natural, ...app.traps];
const cases = JSON.parse(readFileSync(new URL('./kinds-pattern-cases.json', import.meta.url), 'utf8')) as Record<string, { positive: string[]; negative: string[] }>;
const report = (label: Label, description: string) => finding('probe', label.where.route, label.category, { description });

describe('HU-G label boundaries', () => {
  for (const trap of app.traps) it(`${trap.id} has symptom and near-miss coverage in its defect family`, () => {
    expect(cases[trap.id]!.positive.length).toBeGreaterThanOrEqual(7);
    expect(cases[trap.id]!.negative.length).toBeGreaterThanOrEqual(7);
    const paired = { 'expense.refund-row': 'expense.negative-amount-accepted', 'expense.braces-title': 'expense.template-token', 'expense.empty-category': 'expense.ignored-filter', 'expense.legit-duplicate': 'expense.duplicate-write' };
    expect(trap.category).toBe(app.mutations.find(l => l.id === paired[trap.id as keyof typeof paired])!.category);
  });
  for (const [id, samples] of Object.entries(cases)) {
    const label = labels.find(l => l.id === id)!;
    for (const text of samples.positive) it(`${id} accepts: ${text}`, () => {
      expect(matchFinding(report(label, text), label).ok).toBe(true);
      // New defect patterns must not collide with each other or traps.
      if (label.kind === 'defect') for (const other of labels.filter(l => l.id !== id && (cases[l.id] || l.kind === 'natural'))) {
        expect(matchFinding(report(label, text), other).ok, other.id).toBe(false);
      }
    });
    for (const text of samples.negative) it(`${id} rejects: ${text}`, () => {
      expect(matchFinding(report(label, text), label).ok).toBe(false);
    });
  }
  for (const [trapId, defectId, correctReport] of [
    ['refund-row', 'negative-amount-accepted', 'The add form saves a negative amount of -5.'],
    ['braces-title', 'template-token', 'Signed in as {{username}} exposes an unresolved token.'],
    ['empty-category', 'ignored-filter', 'The category filter is ignored; it still lists all expenses.'],
    ['legit-duplicate', 'duplicate-write', 'One save creates two rows for Weekly bus pass.'],
    ['refund-row', 'wrong-total', 'The total is less than the sum of the listed rows; the last row is omitted.'],
  ]) it(`${trapId} false alarm and ${defectId} true positive coexist`, () => {
    const trap = app.traps.find(l => l.id === `expense.${trapId}`)!;
    const defect = app.mutations.find(l => l.id === `expense.${defectId}`)!;
    const bad = report(trap, cases[trap.id]!.positive[0]!);
    const good = { ...report(defect, correctReport), id: 'correct' };
    expect(matchFinding(good, trap).ok).toBe(false);
    const score = scoreEpisode({ ...episode('paired', [trap, defect]), status: 'scored', findings: {
      episode_id: 'paired', system: { name: 'unit', version: '1' }, findings: [bad, good],
    } });
    expect(score.decisions.map(d => [d.decision, d.label_id])).toEqual([
      ['false_alarm_change', trap.id], ['true_positive', defect.id],
    ]);
    const metrics = aggregate([score]);
    expect(metrics.trap_false_alarms).toBe(1);
    expect(metrics.trap_false_alarms_by_label).toEqual({ [trap.id]: 1 });
    expect(metrics.false_alarms_on_changes).toBe(1);
    expect(metrics.defects_found).toBe(1);
    expect(metrics.precision).toBe(0.5);
    score.answer_key_sha256 = 'a'.repeat(64);
    const output = buildReport({ scores: [score], system: { name: 'unit', version: '1' }, runId: 'trap-test' });
    expect(check('report', output)).toEqual([]);
    const markdown = renderMarkdown(output);
    expect(markdown).toContain('Trap false alarms');
    expect(markdown).toContain(`| ${trap.id} | 1 |`);
  });
});
