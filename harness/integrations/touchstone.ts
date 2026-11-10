// Native Docker/browser smoke. Orchestration owns episodes; adapter receives only brief + installed checks.
// TOUCHSTONE_ROOT=<read-only checkout> npx tsx harness/integrations/touchstone.ts
import { mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { generateTrack } from '../generator/src/index.ts';
import { upEpisode, downEpisode } from '../runner/src/index.ts';
import { writeJson, REPO_ROOT } from '../../lib/io.ts';
import { scoreRun } from '../../scorer/src/run.ts';
import { runEpisodes } from './src/episode-loop.ts';
import type { FindingsFile } from '../../lib/contracts.ts';
const root = process.env.TOUCHSTONE_ROOT;
if (!root) throw new Error('TOUCHSTONE_ROOT must name an existing built checkout; it will not be modified');
const module = '../adapters/touchstone/native.mjs';
const { nativeChecks } = await import(module) as { nativeChecks: (opts: { briefPath: string; root: string; out: string }) => Promise<FindingsFile> };
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const runId = `touchstone-checks-${stamp}`;
const runDir = join(REPO_ROOT, 'runs', runId);
const generated = generateTrack(join(REPO_ROOT, 'tracks/visual.yaml'));
// All visual episodes, including twins; selection is fixed before any findings exist.
const ids = generated.episodes.map(e => e.episode.id);
mkdirSync(runDir, { recursive: true });
writeJson(join(runDir, 'run.json'), { id: runId, episodes: ids, tracks: ['visual'], seeds: { visual: generated.track.episodes.seed } });
const completed = await runEpisodes(ids, runDir, {
  up: id => upEpisode(id, { sessionId: runId }),
  checks: session => nativeChecks({ briefPath: session.brief, root: resolve(root), out: session.findings }),
  down: dir => downEpisode(dir),
});
scoreRun(runDir);
console.log(`${completed}/${ids.length} real bench episodes scored; ${ids.length - completed} adapter errors; report: runs/${runId}/report.md`);
if (completed === 0) process.exitCode = 1;
