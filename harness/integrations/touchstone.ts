// Native Docker/browser smoke. Orchestration owns episodes; adapter receives only brief + installed checks.
// TOUCHSTONE_ROOT=<read-only checkout> npx tsx harness/integrations/touchstone.ts
import { mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { generateTrack } from '../generator/src/index.ts';
import { upEpisode, downEpisode } from '../runner/src/index.ts';
import { writeJson, REPO_ROOT } from '../../lib/io.ts';
import { scoreRun } from '../../scorer/src/run.ts';
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
for (const id of ids) {
  const dir = join(runDir, id);
  try {
    const { session } = await upEpisode(id, { sessionId: runId });
    try {
      const findings = await nativeChecks({ briefPath: session.brief, root: resolve(root), out: session.findings });
      writeJson(join(dir, 'runner.json'), { episode_id: id, status: 'scored', wall_time_s: findings.wall_time_s });
    } finally { await downEpisode(dir); }
  } catch {
    writeJson(join(dir, 'runner.json'), { episode_id: id, status: 'adapter_error', status_reason: 'Native integration failed; see local invocation diagnostics' });
    throw new Error(`Native smoke stopped at ${id}; retained partial run in runs/${runId}`);
  }
}
const report = scoreRun(runDir);
if (report.episodes.some(e => e.status !== 'scored')) throw new Error('Some native episodes were not scored');
console.log(`PASS: ${ids.length} real bench episodes scored; report: runs/${runId}/report.md`);
