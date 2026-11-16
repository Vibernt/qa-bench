import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, readData, writeJson, sha256 } from '../../lib/io.ts';
import { generateTrack } from '../generator/src/index.ts';
import { upEpisode, downEpisode } from '../runner/src/index.ts';
import { scoreRun } from '../../scorer/src/run.ts';
import { nativeHunt } from '../adapters/touchstone-hunt/src/native.ts';
import { parseOptions } from '../adapters/touchstone-hunt/src/options.ts';
import { redact } from '../adapters/touchstone-hunt/src/privacy.ts';
import { runHuntSet } from './touchstone-hunt/loop.ts';
export async function main(args: string[]) {
  const opts = parseOptions(args, true);
  if (!/^[a-zA-Z0-9-]+$/.test(opts.set)) throw new Error('Invalid set name');
  const set = readData<{ episodes: string[] }>(join(REPO_ROOT, 'harness/agents/sets', opts.set + '.yaml'));
  if (!set.episodes.length || new Set(set.episodes).size !== set.episodes.length || set.episodes.some(id => !/^[a-z0-9-]+-\d+$/.test(id))) throw new Error('Invalid episode set');
  const tracks = [...new Set(set.episodes.map(id => id.replace(/-\d+$/, '')))];
  const runId = `touchstone-hunt-${opts.policy}-${new Date().toISOString().replace(/\D/g, '')}`;
  const runDir = join(REPO_ROOT, 'runs', runId);
  mkdirSync(runDir, { recursive: true });
  // Orchestrator only: generate public episodes, never send their paths or keys to the adapter.
  const seeds = Object.fromEntries(tracks.map(track => [track, generateTrack(join(REPO_ROOT, 'tracks', track + '.yaml')).track.episodes.seed]));
  writeJson(join(runDir, 'run.json'), { id: runId, episodes: set.episodes, tracks, seeds,
    system: { name: `touchstone-hunt-${opts.policy}`, version: `${opts.policy}+cli.${sha256(readFileSync(join(resolve(opts.root), 'tools/huntbench/run.mjs'))).slice(0, 12)}` } });
  const result = await runHuntSet(set.episodes, runDir, opts, {
    up: id => upEpisode(id, { sessionId: runId }),
    hunt: (session, maxUsd) => nativeHunt({ ...opts, maxUsd, briefPath: session.brief, out: session.findings }),
    down: dir => downEpisode(dir),
  });
  scoreRun(runDir, { notes: `Model ${opts.model}; persona ${opts.persona}; per-episode cap USD ${opts.maxUsd}, ${opts.maxCalls} calls; set cap USD ${opts.totalUsd}. Unknown/failure cost and lifecycle wall time are retained in cost.json. ${opts.live ? 'Live hunt.' : 'Plan only; no model calls.'}` });
  console.log(`${result.completed}/${set.episodes.length} episodes scored; report: runs/${runId}/report.md`);
  if (opts.live && result.completed === 0) process.exitCode = 1;
  return result;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { await main(process.argv.slice(2)); }
  catch (error) { console.error(redact(error instanceof Error ? error.message : String(error))); process.exitCode = 1; }
}
