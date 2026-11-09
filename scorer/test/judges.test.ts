import { afterEach, expect, it } from 'vitest';
import { rmSync } from 'node:fs';
import { fixtureSet } from '../../harness/judges/test/helpers.ts';
import type { JudgeRun } from '../../harness/judges/src/types.ts';
import { qualification, scoreJudges, judgeAgreement, judgeMarkdown } from '../src/judges.ts';
const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })));
function sample(count = 60) {
  const f = fixtureSet(count); dirs.push(f.root);
  const run: JudgeRun = { schema: 'qa-bench.judge-run/v1', model: 'test', manifest_sha256: f.digest,
    config_sha256: 'test', pricing: { source: 'test', checked: 'test', input_per_million: 1, output_per_million: 1 },
    max_usd: 1, status: 'complete', calls: f.set.cases.map(c => ({ case_id: c.id, status: 'answered',
      answer: { outcome: c.label, confidence: .99, probabilities: { problem: c.label === 'problem' ? 1 : 0, ok: c.label === 'ok' ? 1 : 0, unsure: 0 }, reason: 'Observed' },
      input_tokens: 1, output_tokens: 1, cost_usd: .001, reserved_usd: .1, wall_time_ms: 1 })) };
  return { ...f, run };
}
it('scores precision, recall, twins, abstentions, invalid calls and cost independently', () => {
  const f = sample(4);
  f.run.calls[1]!.answer = { outcome: 'problem', confidence: .99, probabilities: { problem: 1, ok: 0, unsure: 0 }, reason: 'False alarm' };
  f.run.calls[2]!.answer = { outcome: 'unsure', confidence: .5, probabilities: { problem: .2, ok: .3, unsure: .5 }, reason: 'Ambiguous' };
  const score = scoreJudges(f.set, f.digest, f.run).overall;
  expect(score.precision).toBe(.5); expect(score.recall).toBe(.5);
  expect(score.false_alarms_on_twins).toBe(1); expect(score.twin_false_alarm_rate).toBe(.5);
  expect(score.unsure_rate).toBe(.25); expect(score.cost_per_case_usd).toBe(.001);
  f.run.calls.pop();
  expect(scoreJudges(f.set, f.digest, f.run).overall.missing_or_invalid).toBe(1);
  expect(scoreJudges(f.set, f.digest, f.run).overall.cost_usd).toBeNull();
});
it('applies exact 50/95% and 200/98% boundaries', () => {
  expect(qualification(49, 1)).toBe('shadow'); expect(qualification(50, .95)).toBe('suggest');
  expect(qualification(50, .9499)).toBe('shadow'); expect(qualification(199, .99)).toBe('suggest');
  expect(qualification(200, .98)).toBe('auto'); expect(qualification(200, .9799)).toBe('suggest');
  expect(qualification(200, null)).toBe('shadow');
});
it('does not grant autonomy to thin kinds or to low-confidence abstention-heavy runs', () => {
  const f = sample();
  expect(scoreJudges(f.set, f.digest, f.run).model_stage).toBe('suggest');
  f.set.cases[0]!.kind = 'a11y';
  expect(scoreJudges(f.set, f.digest, f.run).model_stage).toBe('shadow');
  for (const c of f.run.calls) {
    c.answer!.confidence = .5;
    c.answer!.probabilities = { ok: .5, problem: .5, unsure: 0 };
  }
  expect(scoreJudges(f.set, f.digest, f.run).overall.stage).toBe('shadow');
});
it('refuses duplicates and mixed manifests; reports paired model agreement', () => {
  const f = sample();
  expect(judgeAgreement(f.run, f.run).agreement).toBe(1);
  expect(() => scoreJudges(f.set, 'other', f.run)).toThrow('manifest');
  f.run.calls.push(f.run.calls[0]!);
  expect(() => scoreJudges(f.set, f.digest, f.run)).toThrow('duplicate');
});
it('keeps every model in the same rendered leaderboard table', () => {
  const f = sample();
  const a = scoreJudges(f.set, f.digest, f.run);
  const b = { ...a, model: 'second-model' };
  const markdown = judgeMarkdown([a, b]);
  expect(markdown.indexOf('| second-model /')).toBeLessThan(markdown.indexOf('test: run complete;'));
});
