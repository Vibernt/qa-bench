import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Brief, Episode, Label } from '../../../lib/contracts.ts';
import { REPO_ROOT } from '../../../lib/io.ts';
import { check } from '../../../lib/schemas.ts';
import { generateTrack, loadApps } from '../../generator/src/index.ts';
import {
  ADAPTER_FIXED_ENV, adapterRunArgs, buildArgs, envFileText, hostPortOverride, parsePublishedPort, projectName, redactArgs,
  runEpisodes, type Exec, type ExecOptions, type ExecResult,
} from '../src/index.ts';

const FX = join(REPO_ROOT, 'harness', 'generator', 'test', 'fixtures');
const APPS = join(FX, 'apps');
const TRACKS = join(FX, 'tracks');

const temps: string[] = [];
function temp(): string {
  const d = mkdtempSync(join(tmpdir(), 'qab-run-'));
  temps.push(d);
  return d;
}
afterEach(() => {
  for (const d of temps.splice(0)) rmSync(d, { recursive: true, force: true });
});

// ---- a fake docker ---------------------------------------------------------------------------------------------

interface Call { args: string[]; opts: ExecOptions; envFileMode?: number; envFileText?: string }
type AdapterBehaviour = (ctx: { outDir: string; briefDir: string; args: string[] }) => Partial<ExecResult>;

function fakeDocker(adapter: AdapterBehaviour = writeEmptyFindings): { exec: Exec; calls: Call[] } {
  const calls: Call[] = [];
  const exec: Exec = async (cmd, args, opts = {}) => {
    expect(cmd).toBe('docker');
    const call: Call = { args, opts };
    calls.push(call);
    const ok = (stdout = ''): ExecResult => ({ code: 0, stdout, stderr: '', timedOut: false });
    if (args[0] === 'compose') {
      const ef = args[args.indexOf('--env-file') + 1]!;
      if (args.includes('up')) {
        call.envFileMode = statSync(ef).mode & 0o777;
        call.envFileText = readFileSync(ef, 'utf8');
        return ok();
      }
      if (args.includes('ps')) return ok('cid0123\n');
      if (args.includes('port')) return ok('127.0.0.1:49999\n');
      return ok();
    }
    if (args[0] === 'inspect') {
      const project = calls.find((c) => c.args[0] === 'compose')!.args[2]!;
      return ok(JSON.stringify({ [`${project}_default`]: {} }));
    }
    if (args[0] === 'run') {
      const mounts = args.flatMap((a, i) => (args[i - 1] === '-v' ? [a] : []));
      const briefDir = mounts.find((m) => m.endsWith(':/bench/brief:ro'))!.split(':')[0]!;
      const outDir = mounts.find((m) => m.endsWith(':/bench/out'))!.split(':')[0]!;
      return { ...ok(), ...adapter({ outDir, briefDir, args }) };
    }
    return ok();
  };
  return { exec, calls };
}

function writeEmptyFindings({ outDir, briefDir }: { outDir: string; briefDir: string }): Partial<ExecResult> {
  const brief = JSON.parse(readFileSync(join(briefDir, 'brief.json'), 'utf8')) as Brief;
  writeFileSync(join(outDir, 'findings.json'), JSON.stringify({ episode_id: brief.episode_id, system: { name: 'fake', version: '1' }, findings: [] }));
  return {};
}

function setup(): { episodesRoot: string; runsRoot: string } {
  const root = temp();
  const episodesRoot = join(root, 'episodes');
  generateTrack(join(TRACKS, 'mix.yaml'), { appsRoot: APPS, episodesRoot });
  generateTrack(join(TRACKS, 'quiet.yaml'), { appsRoot: APPS, episodesRoot, live: true });
  return { episodesRoot, runsRoot: join(root, 'runs') };
}

function adaptersRoot(network: 'episode' | 'host' = 'episode', extra: Record<string, unknown> = {}): string {
  const root = temp();
  mkdirSync(join(root, 'fake'), { recursive: true });
  writeFileSync(join(root, 'fake', 'adapter.json'), JSON.stringify({
    name: 'fake', version: '9.9.9', description: 'test', mode: 'container', build: 'Dockerfile', network,
    env_passthrough: ['FAKE_TOKEN'], ...extra,
  }));
  return root;
}

const readEp = (episodesRoot: string, track: string, id: string): Episode =>
  JSON.parse(readFileSync(join(episodesRoot, track, id, 'episode.json'), 'utf8')) as Episode;

// ---- docker argv -----------------------------------------------------------------------------------------------

describe('adapter docker argv (the sealing boundary)', () => {
  const spec = {
    containerName: 'qab-r-ep-adapter', image: 'qa-bench-adapter-x:1', network: 'qab-r-ep_default',
    briefDir: '/runs/r/ep/brief', outDir: '/runs/r/ep/out', envPassthrough: ['TOKEN_B', 'TOKEN_A', 'TOKEN_A'],
  };
  it('mounts only the brief (read-only) and out/, and passes env by allow-listed name only', () => {
    const args = adapterRunArgs(spec);
    const mounts = args.flatMap((a, i) => (args[i - 1] === '-v' || args[i - 1] === '--volume' ? [a] : []));
    expect(mounts).toEqual(['/runs/r/ep/brief:/bench/brief:ro', '/runs/r/ep/out:/bench/out']);
    for (const bad of ['--mount', '--volumes-from', '--privileged', '--pid', '--ipc', '--device', '--env-file', '--cap-add']) {
      expect(args).not.toContain(bad);
    }
    expect(args.join(' ')).not.toContain(REPO_ROOT);
    const envs = args.flatMap((a, i) => (args[i - 1] === '-e' || args[i - 1] === '--env' ? [a] : []));
    expect(envs).toEqual([...Object.entries(ADAPTER_FIXED_ENV).map(([k, v]) => `${k}=${v}`), 'TOKEN_A', 'TOKEN_B']);
    expect(args.slice(-1)).toEqual(['qa-bench-adapter-x:1']);
  });
  it('refuses env names that could smuggle a value', () => {
    expect(() => adapterRunArgs({ ...spec, envPassthrough: ['A=secret'] })).toThrow();
  });
  it('builds with the CA secret and proxies by name only when QA_BENCH_BUILD_CA is set', () => {
    const plain = buildArgs({ tag: 't', context: '/c', dockerfile: '/c/Dockerfile' }, { PATH: '/bin', HTTPS_PROXY: 'http://u:pw@proxy' });
    expect(plain.args).toEqual(['build', '-t', 't', '-f', '/c/Dockerfile', '/c']);
    expect(plain.env.HTTPS_PROXY).toBeUndefined();
    const ca = buildArgs({ tag: 't', context: '/c', dockerfile: '/c/Dockerfile' }, { PATH: '/bin', QA_BENCH_BUILD_CA: '/ca.pem', HTTPS_PROXY: 'http://u:pw@proxy' });
    expect(ca.args).toEqual(['build', '-t', 't', '-f', '/c/Dockerfile', '--network', 'host', '--secret', 'id=extra_ca,src=/ca.pem', '--build-arg', 'HTTPS_PROXY', '/c']);
    expect(ca.args.join(' ')).not.toContain('pw@proxy');
    expect(ca.env.HTTPS_PROXY).toBe('http://u:pw@proxy');
  });
  it('writes env files, overrides and names safely', () => {
    expect(envFileText({ B: 'x:y,z', A: 'has space' })).toBe("A='has space'\nB=x:y,z\n");
    expect(() => envFileText({ A: "it's" })).toThrow();
    expect(hostPortOverride([{ service: 'app', port: 3000 }])).toContain("127.0.0.1::3000");
    expect(parsePublishedPort('127.0.0.1:49153\n')).toBe(49153);
    expect(projectName('qab', 'Noop-20261105-010203', 'regression-001')).toBe('qab-noop-20261105-010203-regression-001');
    expect(redactArgs(['run', '-e', 'A=secret', '-e', 'B'])).toBe('run -e A=… -e B');
  });
});

// ---- the flow, against a fake docker ---------------------------------------------------------------------------

describe('runEpisodes', () => {
  it('brings up, briefs, collects and tears down; the adapter sees only its two folders', async () => {
    const { episodesRoot, runsRoot } = setup();
    const { exec, calls } = fakeDocker();
    const host = { PATH: '/usr/bin', HOME: '/root', FAKE_TOKEN: 'tok-secret-123', ALPHA_DEFECT: 'host_value', SOMETHING_ELSE: 'x' };
    const r = await runEpisodes(
      { adapter: 'fake', episodes: ['mix-003'], runId: 'qab-runner-t1' },
      { appsRoot: APPS, episodesRoot, runsRoot, adaptersRoot: adaptersRoot(), tracksRoot: TRACKS, env: host, exec, log: () => undefined },
    );
    expect(r.results.map((x) => x.status)).toEqual(['scored']);
    const ep = readEp(episodesRoot, 'mix', 'mix-003');
    const epDir = join(runsRoot, 'qab-runner-t1', 'mix-003');

    // Order: info, adapter build, app build, up, ps, inspect, run, rm, down.
    const kinds = calls.map((c) => (c.args[0] === 'compose' ? `compose ${c.args.find((a) => ['up', 'down', 'ps', 'port'].includes(a))}` : c.args[0]));
    expect(kinds).toEqual(['info', 'build', 'build', 'compose up', 'compose ps', 'inspect', 'run', 'rm', 'compose down']);
    expect(calls[1]!.args).toContain('qa-bench-adapter-fake:9.9.9');
    expect(calls[2]!.args).toContain('qa-bench-app-alpha:local');

    // Compose: env file is 0600 while it exists, holds the episode env, and is removed afterwards; the host's own
    // env never reaches compose (a stray ALPHA_DEFECT could switch a defect on).
    const up = calls.find((c) => c.args.includes('up'))!;
    expect(up.envFileMode).toBe(0o600);
    expect(up.envFileText).toBe(envFileText(ep.env));
    expect(up.opts.env).toEqual({ PATH: '/usr/bin', HOME: '/root' });
    expect(existsSync(join(epDir, 'compose.env'))).toBe(false);
    expect(up.args).toEqual(expect.arrayContaining(['-p', 'qab-qab-runner-t1-mix-003', 'up', '-d', '--no-build', '--wait']));
    const down = calls.find((c) => c.args.includes('down'))!;
    expect(down.args).toEqual(expect.arrayContaining(['-p', 'qab-qab-runner-t1-mix-003', 'down', '-v', '--remove-orphans']));

    // Adapter: joins the episode network, two mounts, allow-listed env with values from the env (not argv).
    const run = calls.find((c) => c.args[0] === 'run')!;
    expect(run.args[run.args.indexOf('--network') + 1]).toBe('qab-qab-runner-t1-mix-003_default');
    const mounts = run.args.flatMap((a, i) => (run.args[i - 1] === '-v' ? [a] : []));
    expect(mounts).toEqual([`${join(epDir, 'brief')}:/bench/brief:ro`, `${join(epDir, 'out')}:/bench/out`]);
    const argv = run.args.join(' ');
    for (const p of [APPS, episodesRoot, REPO_ROOT, 'answer-key', 'tok-secret-123']) expect(argv).not.toContain(p);
    expect(run.opts.env?.FAKE_TOKEN).toBe('tok-secret-123');
    expect(run.opts.env?.SOMETHING_ELSE).toBeUndefined();
    expect(run.opts.timeoutMs).toBe((120 + 30) * 1000);
    expect(statSync(join(epDir, 'out')).mode & 0o777).toBe(0o777);

    // Brief: valid, service URLs on the episode network, accounts, budget and journeys from the track.
    const brief = JSON.parse(readFileSync(join(epDir, 'brief', 'brief.json'), 'utf8')) as Brief;
    expect(check('brief', brief)).toEqual([]);
    expect(brief.targets).toEqual([{ name: 'web', url: 'http://web:8080/home' }]);
    expect(brief.budget).toEqual({ wall_time_s: 120, money_usd: 1 });
    expect(brief.journeys?.map((j) => j.id)).toEqual(['alpha.list']);
    expect(brief.roles.find((x) => x.role === 'editor')?.accounts.length).toBe(2);
    expect(brief.out).toEqual({ findings: '/bench/out/findings.json', evidence_dir: '/bench/out/evidence' });

    const runJson = JSON.parse(readFileSync(join(runsRoot, 'qab-runner-t1', 'run.json'), 'utf8'));
    expect(runJson).toMatchObject({ id: 'qab-runner-t1', adapter: 'fake', tracks: ['mix'], episodes: ['mix-003'], seeds: { mix: 20261104 } });
    expect(runJson.finished_at).toBeTypeOf('string');
    const runner = JSON.parse(readFileSync(join(epDir, 'runner.json'), 'utf8'));
    expect(runner).toMatchObject({ episode_id: 'mix-003', status: 'scored', adapter_exit_code: 0 });
  });

  it('never puts an active label id, switch value or switch env key in any brief', async () => {
    const { episodesRoot, runsRoot } = setup();
    const { exec } = fakeDocker();
    const labels = new Map<string, Label>();
    for (const a of loadApps(APPS).values()) for (const l of [...a.mutations, ...a.changes, ...a.baseline]) labels.set(l.id, l);
    const ids = Array.from({ length: 12 }, (_, i) => `mix-${String(i + 1).padStart(3, '0')}`);
    await runEpisodes(
      { adapter: 'fake', episodes: ids, runId: 'seal', parallel: 3 },
      { appsRoot: APPS, episodesRoot, runsRoot, adaptersRoot: adaptersRoot('host'), tracksRoot: TRACKS, env: { PATH: '/bin' }, exec, log: () => undefined },
    );
    let checked = 0;
    for (const id of ids) {
      const ep = readEp(episodesRoot, 'mix', id);
      const file = join(runsRoot, 'seal', id, 'brief', 'brief.json');
      if (ep.app !== 'alpha') {
        expect(existsSync(file)).toBe(false); // beta has no compose.yaml: skipped before any brief
        continue;
      }
      const text = readFileSync(file, 'utf8');
      for (const lid of [...ep.active.mutations, ...ep.active.changes]) {
        expect(text).not.toContain(lid);
        for (const [k, v] of Object.entries(labels.get(lid)!.switch?.env ?? {})) {
          expect(text).not.toContain(k);
          expect(text).not.toContain(v);
        }
      }
      for (const k of Object.keys(ep.env)) expect(text).not.toContain(k);
      expect(text).not.toContain('found_by');
      expect(text).not.toContain(ep.answer_key_sha256);
      const brief = JSON.parse(text) as Brief;
      expect(brief.targets[0]!.url).toBe('http://127.0.0.1:49999/home'); // host network: published port
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
    const override = readFileSync(join(runsRoot, 'seal', ids.find((id) => readEp(episodesRoot, 'mix', id).app === 'alpha')!, 'compose.override.yaml'), 'utf8');
    expect(override).toContain('127.0.0.1::8080');
  });

  it('maps adapter outcomes to statuses and always tears down', async () => {
    const cases: [string, AdapterBehaviour, string][] = [
      ['ok-exit1', (c) => ({ ...writeEmptyFindings(c), code: 1 }), 'scored'],
      ['nofindings', () => ({}), 'invalid_findings'],
      ['crash', () => ({ code: 2 }), 'adapter_error'],
      ['wrongep', ({ outDir }) => { writeFileSync(join(outDir, 'findings.json'), JSON.stringify({ episode_id: 'other', system: { name: 'x', version: '1' }, findings: [] })); return {}; }, 'invalid_findings'],
      ['slow', () => ({ code: 137, timedOut: true }), 'timeout'],
    ];
    for (const [name, behaviour, want] of cases) {
      const { episodesRoot, runsRoot } = setup();
      const { exec, calls } = fakeDocker(behaviour);
      const r = await runEpisodes(
        { adapter: 'fake', episodes: ['mix-003'], runId: name },
        { appsRoot: APPS, episodesRoot, runsRoot, adaptersRoot: adaptersRoot(), tracksRoot: TRACKS, env: { PATH: '/bin' }, exec, log: () => undefined },
      );
      expect([name, r.results[0]!.status]).toEqual([name, want]);
      expect(calls.some((c) => c.args.includes('down'))).toBe(true);
      expect(calls.some((c) => c.args[0] === 'rm' && c.args.includes('-f'))).toBe(true);
      expect(existsSync(join(runsRoot, name, 'mix-003', 'compose.env'))).toBe(false);
    }
  });

  it('skips unavailable apps and live episodes unless allowed; live briefs carry the rules', async () => {
    const { episodesRoot, runsRoot } = setup();
    const { exec, calls } = fakeDocker();
    const opts = { appsRoot: APPS, episodesRoot, runsRoot, adaptersRoot: adaptersRoot(), tracksRoot: TRACKS, exec, log: () => undefined };
    const r = await runEpisodes({ adapter: 'fake', track: 'quiet', runId: 'q1' }, { ...opts, env: { PATH: '/bin' } });
    expect(r.results.map((x) => [x.episode_id, x.status])).toEqual([
      ['quiet-001', 'skipped'], ['quiet-002', 'skipped'], ['quiet-003', 'skipped'], ['quiet-live-01', 'skipped'],
    ]);
    expect(r.results[0]!.status_reason).toMatch(/no compose\.yaml/);
    expect(r.results[3]!.status_reason).toMatch(/QA_BENCH_ALLOW_LIVE=1/);
    expect(calls.some((c) => c.args[0] === 'run')).toBe(false);

    const r2 = await runEpisodes({ adapter: 'fake', episodes: ['quiet-live-01'], runId: 'q2' }, { ...opts, env: { PATH: '/bin', QA_BENCH_ALLOW_LIVE: '1' } });
    expect(r2.results[0]!.status).toBe('scored');
    const run = calls.filter((c) => c.args[0] === 'run').pop()!;
    expect(run.args[run.args.indexOf('--network') + 1]).toBe('bridge');
    const brief = JSON.parse(readFileSync(join(runsRoot, 'q2', 'quiet-live-01', 'brief', 'brief.json'), 'utf8')) as Brief;
    expect(brief.app).toBe('live');
    expect(brief.targets).toEqual([{ name: 'example.org', url: 'https://example.org/' }]);
    expect(brief.rules).toEqual({ methods: ['GET'], forms: false, robots_txt: 'honour', min_interval_ms: 1000 });
  });

  it('marks every episode adapter_error when the adapter image does not build', async () => {
    const { episodesRoot, runsRoot } = setup();
    const { exec: inner, calls } = fakeDocker();
    const exec: Exec = async (cmd, args, o) => (args[0] === 'build' && args.includes('qa-bench-adapter-fake:9.9.9') ? { code: 1, stdout: '', stderr: 'boom', timedOut: false } : inner(cmd, args, o));
    const r = await runEpisodes(
      { adapter: 'fake', episodes: ['mix-003', 'mix-004'], runId: 'nob' },
      { appsRoot: APPS, episodesRoot, runsRoot, adaptersRoot: adaptersRoot(), tracksRoot: TRACKS, env: { PATH: '/bin' }, exec, log: () => undefined },
    );
    expect(r.results.map((x) => x.status)).toEqual(['adapter_error', 'adapter_error']);
    expect(r.results[0]!.status_reason).toMatch(/boom/);
    expect(calls.filter((c) => c.args.includes('up')).length).toBe(2);
    expect(calls.filter((c) => c.args.includes('down')).length).toBe(2);
  });

  it('imports findings for a manual adapter', async () => {
    const { episodesRoot, runsRoot } = setup();
    const { exec, calls } = fakeDocker();
    const ar = temp();
    mkdirSync(join(ar, 'human'));
    writeFileSync(join(ar, 'human', 'adapter.json'), JSON.stringify({ name: 'human', version: '0', description: 'person', mode: 'manual' }));
    const f = join(temp(), 'f.json');
    writeFileSync(f, JSON.stringify({ episode_id: 'mix-003', system: { name: 'human', version: '0' }, findings: [] }));
    const opts = { appsRoot: APPS, episodesRoot, runsRoot, adaptersRoot: ar, tracksRoot: TRACKS, env: { PATH: '/bin' }, exec, log: () => undefined };
    const a = await runEpisodes({ adapter: 'human', episodes: ['mix-003'], runId: 'm1' }, opts);
    expect(a.results[0]!.status).toBe('skipped');
    expect(existsSync(join(runsRoot, 'm1', 'mix-003', 'brief', 'brief.json'))).toBe(true);
    const b = await runEpisodes({ adapter: 'human', episodes: ['mix-003'], runId: 'm2' }, { ...opts, findingsImport: f });
    expect(b.results[0]!.status).toBe('scored');
    expect(calls.filter((c) => c.args[0] !== 'info')).toEqual([]);
  });
});
