import { describe, expect, it } from 'vitest';
import type { EpisodeScore } from '../../lib/contracts.ts';
import { assertValid } from '../../lib/schemas.ts';
import { aggregate, buildReport, renderMarkdown, scoreEpisode } from '../src/index.ts';
import { episode, finding, label, loadFindings } from './helpers.ts';
import { check } from '../../lib/schemas.ts';

const labels = () => [
  label('swag.price', { found_by: [{ kind: 'value', selector: '[data-test=price]' }], where: { route: '/inventory.html', role: 'standard_user' } }),
  label('swag.missed', { category: 'perf', where: { route: '/checkout.html' } }),
  label('swag.cart-copy', { kind: 'change', category: 'copy', where: { route: '/cart.html' } }),
  label('swag.login-a11y', { kind: 'baseline', category: 'a11y', class: 'judged', where: { route: '/login' } }),
];

function mixed(): EpisodeScore {
  const findings = loadFindings('mixed.findings.json');
  expect(check('findings', findings)).toEqual([]);
  return scoreEpisode({ ...episode('regression-001', labels()), findings, status: 'scored', wall_time_s: 60 });
}

describe('scoreEpisode', () => {
  const s = mixed();
  const dec = Object.fromEntries(s.decisions.map((d) => [d.finding_id, d]));

  it('gives every finding exactly one decision', () => {
    expect(s.decisions.map((d) => d.finding_id)).toEqual(['f1', 'f2', 'f3', 'f4', 'f5']);
  });
  it('first hit is a true positive, later ones are duplicates', () => {
    expect(dec.f1!.decision).toBe('true_positive');
    expect(dec.f1!.label_id).toBe('swag.price');
    expect(dec.f2!.decision).toBe('duplicate');
    expect(dec.f2!.reason).toContain('already found by f1');
  });
  it('change, baseline and unmatched decisions carry reasons', () => {
    expect(dec.f3!.decision).toBe('false_alarm_change');
    expect(dec.f4!.decision).toBe('excused');
    expect(dec.f5!.decision).toBe('unmatched');
    expect(dec.f5!.reason).toMatch(/closest: .*swag\./);
  });
  it('records label outcomes and time to first detection (true positives only)', () => {
    const hit = Object.fromEntries(s.labels.map((l) => [l.label_id, l.hit]));
    expect(hit).toEqual({ 'swag.price': true, 'swag.missed': false, 'swag.cart-copy': true, 'swag.login-a11y': true });
    expect(s.labels.find((l) => l.label_id === 'swag.price')!.finding_ids).toEqual(['f1', 'f2']);
    expect(s.time_to_first_detection_s).toBe(30); // f2 (12 s) is a duplicate
  });
  it('prefers a defect over a change that also matches', () => {
    const ls = [label('swag.d', { category: 'copy' }), label('swag.c', { kind: 'change', category: 'copy' })];
    const r = scoreEpisode({ ...episode('e', ls), findings: { episode_id: 'e', system: { name: 'x', version: '1' }, findings: [finding('a', '/inventory.html', 'copy')] as never }, status: 'scored' });
    expect(r.decisions[0]!.decision).toBe('true_positive');
  });
  it('picks the more specific defect when two match', () => {
    const ls = [
      label('swag.generic', { where: { route: '*' } }),
      label('swag.specific', { found_by: [{ kind: 'element', selector: '#buy' }] }),
    ];
    const f = { episode_id: 'e', system: { name: 'x', version: '1' }, findings: [finding('a', '/inventory.html', 'functional', { selector: '#buy' })] };
    const r = scoreEpisode({ ...episode('e', ls), findings: f as never, status: 'scored' });
    expect(r.decisions[0]!.label_id).toBe('swag.specific');
  });
});

describe('episodes that are not scored', () => {
  it.each(['adapter_error', 'timeout', 'skipped', 'invalid_findings'] as const)('%s counts defects as missed with no findings', (status) => {
    const s = scoreEpisode({ ...episode('e', labels()), findings: loadFindings('mixed.findings.json'), status, status_reason: 'boom' });
    expect(s.decisions).toEqual([]);
    expect(s.labels.filter((l) => l.kind === 'defect').every((l) => !l.hit)).toBe(true);
    expect(s.status_reason).toBe('boom');
    expect(s.time_to_first_detection_s).toBeNull();
    const m = aggregate([s]);
    expect(m.defects_planted).toBe(2);
    expect(m.defects_found).toBe(0);
    expect(m.recall).toBe(0);
    expect(m.precision).toBeNull();
    expect(m.f1).toBeNull();
    expect(m.episodes_scored).toBe(0);
  });
  it('scored with null findings means zero findings', () => {
    const s = scoreEpisode({ ...episode('e', labels()), findings: null, status: 'scored' });
    expect(s.decisions).toEqual([]);
  });
});

describe('aggregate', () => {
  it('computes recall, precision, F1 and change metrics', () => {
    const m = aggregate([mixed()]);
    expect(m).toMatchObject({
      episodes: 1, episodes_scored: 1, defects_planted: 2, defects_found: 1, recall: 0.5,
      findings: 5, findings_matched: 2, findings_excused: 1, precision: 0.5, f1: 0.5,
      changes_active: 1, changes_flagged: 1, change_flag_rate: 1, false_alarms_on_changes: 1,
      false_alarms_per_100_episodes: 100, unmatched_findings: 1, unmatched_per_episode: 1,
      mean_time_to_first_detection_s: 30, wall_time_s_total: 60, repro_rate: null,
    });
  });
  it('sums cost with human hours at the stated rate', () => {
    const m = aggregate([mixed()]);
    expect(m.cost_usd_total).toBeCloseTo(0.5 + 0.25 + 0.5 * 60);
    expect(m.human_hours_total).toBe(0.5);
    expect(m.cost_per_defect_found_usd).toBeCloseTo(m.cost_usd_total!);
  });
  it('is null-safe: no cost, no time, no defects, no episodes', () => {
    const noise = scoreEpisode({
      ...episode('noise-001', [], 'noise'), findings: loadFindings('noise.findings.json'), status: 'scored',
    });
    const m = aggregate([noise]);
    expect(m).toMatchObject({
      defects_planted: 0, recall: null, findings: 2, precision: 0, f1: null, unmatched_findings: 2, unmatched_per_episode: 2,
      false_alarms_per_100_episodes: 0, change_flag_rate: null, cost_usd_total: null, human_hours_total: null,
      wall_time_s_total: null, mean_time_to_first_detection_s: null, cost_per_defect_found_usd: null,
    });
    const empty = aggregate([]);
    expect(empty).toMatchObject({ episodes: 0, recall: null, precision: null, false_alarms_per_100_episodes: null, unmatched_per_episode: null });
  });
  it('aggregates across episodes', () => {
    const noise = scoreEpisode({ ...episode('noise-001', [], 'noise'), findings: loadFindings('noise.findings.json'), status: 'scored', wall_time_s: 5 });
    const crashed = scoreEpisode({ ...episode('regression-002', labels()), findings: null, status: 'adapter_error', wall_time_s: 3 });
    const m = aggregate([mixed(), noise, crashed]);
    expect(m.episodes).toBe(3);
    expect(m.defects_planted).toBe(4);
    expect(m.defects_found).toBe(1);
    expect(m.unmatched_findings).toBe(3);
    expect(m.wall_time_s_total).toBe(68);
    expect(m.false_alarms_per_100_episodes).toBeCloseTo(100 / 3);
  });
});

describe('report', () => {
  const noise = scoreEpisode({ ...episode('noise-001', [], 'noise'), findings: loadFindings('noise.findings.json'), status: 'scored' });
  const report = buildReport({
    scores: [mixed(), noise], system: { name: 'hand-written', version: '1' }, runId: 'run-1',
    seeds: { regression: 7 }, now: new Date('2026-11-05T00:00:00Z'),
  });

  it('validates against the report schema', () => {
    assertValid('report', report);
    expect(report.run.matcher).toMatch(/^deterministic-/);
    expect(report.run.tracks).toEqual(['noise', 'regression']);
  });
  it('slices by track, category, class and breakdown', () => {
    const { by_track, by_category, by_class, breakdown } = report.metrics;
    expect(by_track.regression!.recall).toBe(0.5);
    expect(by_track.noise!.unmatched_per_episode).toBe(2);
    // category slice: labels of the category, findings by their own category
    expect(by_category.functional).toMatchObject({ defects_planted: 1, defects_found: 1, recall: 1, findings: 2, precision: 1 });
    expect(by_category.perf).toMatchObject({ defects_planted: 1, defects_found: 0, recall: 0, findings: 0, precision: null });
    expect(by_category.visual!.unmatched_findings).toBe(2); // f5 and n1
    // class slice: findings by matched label's class, unmatched against every class
    expect(by_class.deterministic).toMatchObject({ defects_planted: 2, defects_found: 1 });
    expect(by_class.deterministic!.unmatched_findings).toBe(3);
    expect(by_class.judged!.findings_excused).toBe(1);
    const row = breakdown.find((b) => b.track === 'regression' && b.category === 'functional' && b.class === 'deterministic')!;
    expect(row.metrics.recall).toBe(1);
    expect(breakdown.some((b) => b.track === 'noise')).toBe(false); // noise episode has no labels
    assertValid('report', report);
  });
  it('renders the key Markdown rows', () => {
    const md = renderMarkdown(report);
    expect(md).toContain('# QA Bench report: hand-written 1 (bench 0.1.0-b0)');
    expect(md).toContain('| Recall | 50.0% (1/2 defects) |');
    expect(md).toContain('| Precision | 33.3% |'); // 2 matched / (7 findings - 1 excused)
    expect(md).toContain('| Mean time to first detection | 30.0 s |');
    expect(md).toContain('| Cost | $30.75 (per defect found: $30.75) |');
    expect(md).toContain('| Unmatched findings per episode | 1.50 |');
    expect(md).toContain('| regression |');
    expect(md).toContain('| regression | functional | deterministic | 1/1 | 100.0% | 100.0% | 0 |');
    expect(md).toContain('<details><summary>regression-001');
    expect(md).toContain('`f3` **false_alarm_change** → `swag.cart-copy`');
    expect(md).toContain('`n1` **unmatched**');
    expect(md).toContain('Missed defects: `swag.missed`');
  });
  it('renders null as an em dash', () => {
    const md = renderMarkdown(buildReport({ scores: [], system: { name: 's', version: '1' }, runId: 'r' }));
    expect(md).toContain('| Recall | — (0/0 defects) |');
    expect(md).toContain('| Cost | — (per defect found: —) |');
  });
});

describe('severity weighting', () => {
  const ls = [
    label('swag.crit', { severity: 'critical', where: { route: '/a.html' } }),
    label('swag.maj', { severity: 'major', where: { route: '/b.html' } }),
    label('swag.min', { severity: 'minor', where: { route: '/c.html' } }),
  ];
  const run = (fs: ReturnType<typeof finding>[]) =>
    aggregate([scoreEpisode({ ...episode('regression-009', ls), findings: { episode_id: 'regression-009', system: { name: 's', version: '1' }, findings: fs as never }, status: 'scored' })]);

  it('a found critical outweighs a found minor', () => {
    const critOnly = run([finding('f1', '/a.html')]);
    const minOnly = run([finding('f1', '/c.html')]);
    expect(critOnly.recall).toBeCloseTo(1 / 3);
    expect(minOnly.recall).toBeCloseTo(1 / 3);
    expect(critOnly.weighted_recall).toBeCloseTo(5 / 9);
    expect(minOnly.weighted_recall).toBeCloseTo(1 / 9);
    expect(critOnly.weighted_defects_planted).toBe(9);
    expect(critOnly.weighted_f1).toBeCloseTo((2 * (5 / 9) * 1) / (5 / 9 + 1));
  });

  it('scores whether a true positive stated the label severity', () => {
    const m = run([finding('f1', '/a.html', 'functional', { severity: 'critical' }), finding('f2', '/b.html', 'functional', { severity: 'minor' }), finding('f3', '/c.html')]);
    expect(m.severity_judged).toBe(2);
    expect(m.severity_agreement).toBeCloseTo(0.5);
  });

  it('is null-safe with no defects', () => {
    const m = aggregate([]);
    expect(m.weighted_recall).toBeNull();
    expect(m.severity_agreement).toBeNull();
  });
});
