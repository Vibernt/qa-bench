import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { Report } from '../../lib/contracts.ts';
import { sha256 } from '../../lib/io.ts';
import { assertValid } from '../../lib/schemas.ts';
import { scoreRun } from '../src/index.ts';
import { episode, label, loadFindings } from './helpers.ts';

const tmp = mkdtempSync(join(tmpdir(), 'qab-scorer-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
const put = (p: string, v: unknown) => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, typeof v === 'string' ? v : JSON.stringify(v, null, 2)); };

function makeEpisode(root: string, id: string, track: string, labels = [label('swag.price')]) {
  const { episode: ep, answerKey } = episode(id, labels, track);
  const keyText = JSON.stringify(answerKey, null, 2);
  ep.answer_key_sha256 = sha256(keyText);
  ep.upstream = { commit: 'abc' };
  put(join(root, track, id, 'episode.json'), ep);
  put(join(root, track, id, 'answer-key.json'), keyText);
}
const runner = (dir: string, id: string, status: string, extra = {}) =>
  put(join(dir, id, 'runner.json'), { episode_id: id, status, wall_time_s: 10, started_at: 'a', finished_at: 'b', ...extra });

describe('scoreRun', () => {
  const eps = join(tmp, 'episodes');
  const run = join(tmp, 'runs', 'r1');
  makeEpisode(eps, 'regression-001', 'regression');
  makeEpisode(eps, 'regression-002', 'regression');
  makeEpisode(eps, 'regression-003', 'regression');
  makeEpisode(eps, 'regression-004', 'regression');
  put(join(run, 'run.json'), {
    id: 'r1', bench_version: '0.1.0-b0', adapter: 'hand', started_at: 'a', tracks: ['regression'], seeds: { regression: 5 },
    episodes: ['regression-001', 'regression-002', 'regression-003', 'regression-004'],
  });
  const good = loadFindings('mixed.findings.json');
  good.episode_id = 'regression-001';
  good.findings = [good.findings[1]!]; // /inventory.html functional
  runner(run, 'regression-001', 'scored');
  put(join(run, 'regression-001', 'out', 'findings.json'), good);
  runner(run, 'regression-002', 'adapter_error', { status_reason: 'exit 1' });
  runner(run, 'regression-003', 'scored');
  put(join(run, 'regression-003', 'out', 'findings.json'), { episode_id: 'regression-003', findings: 'nope' });
  // regression-004: no runner.json at all

  const report: Report = scoreRun(run, { episodesRoot: eps });

  it('scores each episode and writes score.json, report.json, report.md', () => {
    assertValid('report', JSON.parse(readFileSync(join(run, 'report.json'), 'utf8')));
    expect(readFileSync(join(run, 'report.md'), 'utf8')).toContain('# QA Bench report');
    expect(JSON.parse(readFileSync(join(run, 'regression-001', 'score.json'), 'utf8')).decisions[0].decision).toBe('true_positive');
    const by = Object.fromEntries(report.episodes.map((e) => [e.episode_id, e]));
    expect(by['regression-001']!.status).toBe('scored');
    expect(by['regression-001']!.wall_time_s).toBe(10);
    expect(by['regression-002']!.status).toBe('adapter_error');
    expect(by['regression-002']!.status_reason).toBe('exit 1');
    expect(by['regression-003']!.status).toBe('invalid_findings');
    expect(by['regression-003']!.decisions).toEqual([]);
    expect(by['regression-004']!.status).toBe('skipped');
  });
  it('takes seeds, upstreams and system from the run and findings', () => {
    expect(report.run.seeds).toEqual({ regression: 5 });
    expect(report.run.upstreams).toEqual({ swag: { commit: 'abc' } });
    expect(report.system).toEqual({ name: 'hand-written', version: '1' });
    expect(report.metrics.overall).toMatchObject({ episodes: 4, episodes_scored: 1, defects_planted: 4, defects_found: 1, recall: 0.25 });
  });
  it('lets opts.system override', () => {
    expect(scoreRun(run, { episodesRoot: eps, system: { name: 'o', version: '2' } }).system.name).toBe('o');
  });
  it('throws when the answer key hash does not match', () => {
    const bad = join(tmp, 'bad-eps');
    makeEpisode(bad, 'regression-001', 'regression');
    writeFileSync(join(bad, 'regression', 'regression-001', 'answer-key.json'), '{"tampered":true}');
    expect(() => scoreRun(run, { episodesRoot: bad })).toThrow(/sha256/);
  });
  it('throws when an episode is missing, and reads the held-out root from the environment', () => {
    const held = join(tmp, 'held');
    const only = join(tmp, 'runs', 'r2');
    makeEpisode(held, 'heldout-001', 'regression');
    put(join(only, 'run.json'), { id: 'r2', bench_version: 'x', adapter: 'h', started_at: 'a', episodes: ['heldout-001'] });
    runner(only, 'heldout-001', 'timeout');
    expect(() => scoreRun(only, { episodesRoot: eps })).toThrow(/not found/);
    process.env.QA_BENCH_HELDOUT_DIR = held;
    try {
      expect(scoreRun(only, { episodesRoot: eps }).episodes[0]!.status).toBe('timeout');
    } finally { delete process.env.QA_BENCH_HELDOUT_DIR; }
  });
});
