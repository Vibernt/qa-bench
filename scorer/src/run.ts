import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AnswerKey, Episode, EpisodeScore, EpisodeStatus, FindingsFile, Report, SystemId } from '../../lib/contracts.ts';
import { REPO_ROOT, readData, sha256, writeJson } from '../../lib/io.ts';
import { assertValid, check } from '../../lib/schemas.ts';
import { scoreEpisode } from './score.ts';
import { buildReport, renderMarkdown } from './report.ts';

interface RunJson { id: string; system?: SystemId; tracks?: string[]; episodes: string[]; seeds?: Record<string, number> }
interface RunnerJson { episode_id: string; status: EpisodeStatus; status_reason?: string; wall_time_s?: number | null }

function findEpisodeDir(id: string, roots: string[]): string {
  for (const root of roots) {
    for (const base of [root, join(root, 'episodes')]) {
      if (!existsSync(base)) continue;
      for (const track of readdirSync(base, { withFileTypes: true })) {
        if (!track.isDirectory()) continue;
        const dir = join(base, track.name, id);
        if (existsSync(join(dir, 'episode.json'))) return dir;
      }
    }
  }
  throw new Error(`episode ${id} not found under ${roots.join(', ')}`);
}

export function scoreRun(runDir: string, opts: { episodesRoot?: string; system?: SystemId; notes?: string } = {}): Report {
  const run = readData<RunJson>(join(runDir, 'run.json'));
  const roots = [opts.episodesRoot ?? join(REPO_ROOT, 'episodes')];
  if (process.env.QA_BENCH_HELDOUT_DIR) roots.push(process.env.QA_BENCH_HELDOUT_DIR);

  const scores: EpisodeScore[] = [];
  const upstreams: Record<string, unknown> = {};
  let findingsSystem: SystemId | undefined;

  for (const id of run.episodes) {
    const dir = findEpisodeDir(id, roots);
    const episode = readData<Episode>(join(dir, 'episode.json'));
    const keyBytes = readFileSync(join(dir, 'answer-key.json'));
    if (sha256(keyBytes) !== episode.answer_key_sha256) throw new Error(`episode ${id}: answer-key.json sha256 does not match episode.answer_key_sha256`);
    const answerKey = JSON.parse(keyBytes.toString('utf8')) as AnswerKey;
    if (episode.upstream) upstreams[episode.app] = episode.upstream;

    const epRun = join(runDir, id);
    const runnerPath = join(epRun, 'runner.json');
    let status: EpisodeStatus = 'skipped';
    let reason: string | undefined = 'runner.json missing';
    let wall: number | null | undefined = null;
    if (existsSync(runnerPath)) {
      const r = readData<RunnerJson>(runnerPath);
      status = r.status; reason = r.status_reason; wall = r.wall_time_s ?? null;
    }

    let findings: FindingsFile | null = null;
    if (status === 'scored') {
      const fp = join(epRun, 'out', 'findings.json');
      if (!existsSync(fp)) { status = 'invalid_findings'; reason = 'out/findings.json missing'; }
      else {
        let parsed: unknown;
        try { parsed = JSON.parse(readFileSync(fp, 'utf8')); } catch (e) { parsed = undefined; reason = `findings.json is not JSON: ${(e as Error).message}`; }
        const errors = parsed === undefined ? [reason!] : check('findings', parsed);
        if (!errors.length && (parsed as FindingsFile).episode_id !== id) errors.push(`episode_id ${(parsed as FindingsFile).episode_id} ≠ ${id}`);
        if (errors.length) { status = 'invalid_findings'; reason = errors.slice(0, 3).join('; '); }
        else { findings = parsed as FindingsFile; findingsSystem ??= findings.system; }
      }
    }
    const score = scoreEpisode({ episode, answerKey, findings, status, status_reason: reason, wall_time_s: wall });
    writeJson(join(epRun, 'score.json'), score);
    scores.push(score);
  }

  const system = opts.system ?? run.system ?? findingsSystem ?? { name: 'unknown', version: 'unknown' };
  const report = buildReport({
    scores, system, runId: run.id, tracks: run.tracks, seeds: run.seeds,
    upstreams: Object.keys(upstreams).length ? upstreams : undefined, notes: opts.notes,
  });
  assertValid('report', report, 'report');
  writeJson(join(runDir, 'report.json'), report);
  writeText(join(runDir, 'report.md'), renderMarkdown(report));
  return report;
}

function writeText(path: string, text: string): void { writeFileSync(path, text.endsWith('\n') ? text : text + '\n'); }
