// Native integration check for the runner (needs docker; not a unit test, never run in CI):
//   QA_BENCH_BUILD_CA=<pem, only behind a TLS-intercepting proxy> npx tsx harness/runner/verify.ts
// It generates the regression track (apps that exist) into a temp folder, runs three episodes (clean, mixed, twin)
// with the noop adapter on the episode network, one with a host-network copy of noop, one that overruns its
// budget, scores the first run, and checks that teardown left no containers or networks behind.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import YAML from 'yaml';
import type { Brief, Episode } from '../../lib/contracts.ts';
import { REPO_ROOT } from '../../lib/io.ts';
import { scoreRun } from '../../scorer/src/index.ts';
import { generateTrack, loadTrack } from '../generator/src/index.ts';
import { realExec, runEpisodes } from './src/index.ts';

const results: [string, boolean, string][] = [];
const ok = (name: string, pass: boolean, detail = ''): void => {
  results.push([name, pass, detail]);
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const prefix = `runner-verify-${stamp}`;
const tmp = mkdtempSync(join(tmpdir(), 'qab-runner-verify-'));
const episodesRoot = join(tmp, 'episodes');
const runsRoot = join(tmp, 'runs');
const log = (l: string): void => console.log(`  ${l}`);

try {
  const trackFile = join(REPO_ROOT, 'tracks', 'regression.yaml');
  const present = loadTrack(trackFile).apps.map((a) => a.app).filter((a) => existsSync(join(REPO_ROOT, 'apps', a, 'app.yaml')));
  const gen = generateTrack(trackFile, { episodesRoot, onlyApps: present });
  const eps = gen.episodes.map((g) => g.episode);
  const pick = (k: Episode['kind']): Episode => eps.find((e) => e.kind === k)!;
  const chosen = [pick('clean'), pick('mixed'), pick('twin')];
  ok('generate', chosen.every(Boolean), `${eps.length} episodes for ${present.join(', ')}; using ${chosen.map((e) => `${e.id} (${e.kind}, ${e.app})`).join(', ')}`);

  // 1. noop on the episode network.
  const r1 = await runEpisodes({ adapter: 'noop', episodes: chosen.map((e) => e.id), runId: `${prefix}-a` }, { episodesRoot, runsRoot, log });
  ok('three episodes scored', r1.results.every((r) => r.status === 'scored'), r1.results.map((r) => `${r.episode_id}=${r.status}`).join(' '));
  for (const e of chosen) {
    const dir = join(r1.runDir, e.id);
    const brief = JSON.parse(readFileSync(join(dir, 'brief', 'brief.json'), 'utf8')) as Brief;
    const logText = readFileSync(join(dir, 'adapter.log'), 'utf8').trim();
    ok(`${e.id}: brief written`, brief.episode_id === e.id && brief.targets.length > 0, brief.targets.map((t) => t.url).join(' '));
    ok(`${e.id}: adapter reached the app on the episode network`, /-> [23]\d\d/.test(logText), logText);
    ok(`${e.id}: findings collected`, existsSync(join(dir, 'out', 'findings.json')));
    ok(`${e.id}: env file removed`, !existsSync(join(dir, 'compose.env')));
  }
  const report = scoreRun(r1.runDir, { episodesRoot });
  ok('scored', existsSync(join(r1.runDir, 'report.md')) && report.episodes.length === 3, `report: ${join(r1.runDir, 'report.md')}`);

  // 2. a host-network copy of noop: ports published on 127.0.0.1 and read back.
  const adaptersRoot = join(tmp, 'adapters');
  mkdirSync(adaptersRoot);
  cpSync(join(REPO_ROOT, 'harness', 'adapters', 'noop'), join(adaptersRoot, 'noop'), { recursive: true });
  const m = JSON.parse(readFileSync(join(adaptersRoot, 'noop', 'adapter.json'), 'utf8'));
  writeFileSync(join(adaptersRoot, 'noop', 'adapter.json'), JSON.stringify({ ...m, network: 'host' }));
  const r2 = await runEpisodes({ adapter: 'noop', episodes: [chosen[1]!.id], runId: `${prefix}-b` }, { episodesRoot, runsRoot, adaptersRoot, log });
  const b2 = JSON.parse(readFileSync(join(r2.runDir, chosen[1]!.id, 'brief', 'brief.json'), 'utf8')) as Brief;
  const l2 = readFileSync(join(r2.runDir, chosen[1]!.id, 'adapter.log'), 'utf8').trim();
  ok('host network: published port reached', r2.results[0]!.status === 'scored' && /^http:\/\/127\.0\.0\.1:\d+\//.test(b2.targets[0]!.url) && /-> [23]\d\d/.test(l2), l2);

  // 3. an adapter that overruns a 1 s budget is killed: status timeout.
  cpSync(join(adaptersRoot, 'noop'), join(adaptersRoot, 'sleepy'), { recursive: true });
  writeFileSync(join(adaptersRoot, 'sleepy', 'adapter.json'), JSON.stringify({ ...m, name: 'sleepy', command: ['sh', '-c', 'sleep 120'] }));
  const tracksRoot = join(tmp, 'tracks');
  mkdirSync(tracksRoot);
  const t = YAML.parse(readFileSync(trackFile, 'utf8'));
  writeFileSync(join(tracksRoot, 'regression.yaml'), YAML.stringify({ ...t, brief: { ...t.brief, wall_time_s: 1 } }));
  const t0 = Date.now();
  const r3 = await runEpisodes({ adapter: 'sleepy', episodes: [chosen[0]!.id], runId: `${prefix}-c` }, { episodesRoot, runsRoot, adaptersRoot, tracksRoot, graceS: 2, log });
  ok('timeout', r3.results[0]!.status === 'timeout' && Date.now() - t0 < 60_000, `${r3.results[0]!.status} (${r3.results[0]!.status_reason}) in ${Math.round((Date.now() - t0) / 1000)} s`);
} catch (e) {
  ok('verify ran', false, (e as Error).stack ?? String(e));
} finally {
  const ps = await realExec('docker', ['ps', '-a', '--filter', `name=qab-${prefix}`, '--format', '{{.Names}}']);
  const nets = await realExec('docker', ['network', 'ls', '--filter', `name=qab-${prefix}`, '--format', '{{.Name}}']);
  ok('teardown left no containers', ps.stdout.trim() === '', ps.stdout.trim());
  ok('teardown left no networks', nets.stdout.trim() === '', nets.stdout.trim());
  await realExec('docker', ['rmi', 'qa-bench-adapter-sleepy:0.1.0']);
  if (!process.env.QA_BENCH_VERIFY_KEEP) rmSync(tmp, { recursive: true, force: true });
  else console.log(`kept ${tmp}`);
}

const failed = results.filter((r) => !r[1]).length;
console.log(`runner verify: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
