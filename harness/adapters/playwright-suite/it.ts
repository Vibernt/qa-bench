// Integration check for the playwright-suite adapter. Needs docker and a local Chromium, so it is
// NOT a *.test.ts and never runs in CI. Run natively from the repo root:
//
//   node harness/adapters/playwright-suite/it.ts [--native-only | --docker-only] [--only expense,swag,internet]
//
// Native phase: each app runs in its own container on a published port; the suite runs in this process
// against hand-written briefs. Docker phase: the adapter image runs exactly as the runner starts it
// (episode network, brief mounted read-only, out mounted read-write).
//
// Images used (override with env): EXPENSE_IMAGE (qa-bench-app-expense-app:local),
// SWAG_IMAGE (qa-bench-app-swag-labs:local), INTERNET_IMAGE (qa-bench-app-the-internet:local).
// SWAG_UPSTREAM_BUILD: a directory with a static build of upstream sample-app-web; when set, its
// built-in users (standard_user as the clean control, the faulty users as defects) are run too.
// Out: $QAB_PW_IT_DIR (default <os tmp>/qab-pw-it). Run with plain `node`, not tsx: tsx rewrites the
// functions handed to page.evaluate.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runEpisode } from './src/run.ts';
import type { Brief, FindingsFile } from './src/types.ts';
import { check } from '../../../lib/schemas.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.QAB_PW_IT_DIR ?? join(tmpdir(), 'qab-pw-it');
const ADAPTER_IMAGE = 'qa-bench-adapter-playwright-suite:0.1.0';
const EXPENSE_IMAGE = process.env.EXPENSE_IMAGE ?? 'qa-bench-app-expense-app:local';
const SWAG_IMAGE = process.env.SWAG_IMAGE ?? 'qa-bench-app-swag-labs:local';
const INTERNET_IMAGE = process.env.INTERNET_IMAGE ?? 'qa-bench-app-the-internet:local';
const NET = 'qab-pw-net';
const args = process.argv.slice(2);
const only = (args[args.indexOf('--only') + 1] ?? '').split(',').filter((s) => args.includes('--only') && s);
const want = (app: string): boolean => only.length === 0 || only.includes(app);
const native = !args.includes('--docker-only');
const dockerPhase = !args.includes('--native-only');

const VIEWER = { username: 'viewer-it-1', password: 'pw-viewer-it-1' };
const EDITOR = { username: 'editor-it-1', password: 'pw-editor-it-1' };
const CUSTOMER = { username: 'customer-it-1', password: 'pw-customer-it-1' };
const EXPENSE_DEFECTS = ['permission_bypass', 'stale_state', 'ignored_filter', 'wrong_total', 'missing_persistence', 'duplicate_write', 'misleading_success'];
const SWAG_FAULTY = ['problem_user', 'error_user', 'visual_user', 'performance_glitch_user', 'locked_out_user'];

interface Result { phase: string; app: string; name: string; expect: 'none' | 'some' | 'report'; findings: number; valid: boolean; seconds: number; summary: string[]; ok: boolean }
const results: Result[] = [];

function docker(...a: string[]): string {
  return execFileSync('docker', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function quietDocker(...a: string[]): void {
  try { docker(...a); } catch { /* ignore */ }
}
function startApp(name: string, image: string, port: number, env: Record<string, string>, network?: string): string {
  quietDocker('rm', '-f', name);
  const envArgs = Object.entries(env).flatMap(([k, v]) => ['-e', `${k}=${v}`]);
  const netArgs = network ? ['--network', network, '--network-alias', 'app'] : ['-p', `127.0.0.1::${port}`];
  docker('run', '-d', '--name', name, ...netArgs, ...envArgs, image);
  return name;
}
function startUpstreamSwag(name: string, buildDir: string): void {
  quietDocker('rm', '-f', name);
  const conf = join(OUT, 'swag-nginx.conf');
  writeFileSync(conf, 'server { listen 80; root /usr/share/nginx/html; location / { try_files $uri $uri/ /index.html; } }\n');
  docker('run', '-d', '--name', name, '-p', '127.0.0.1::80', '-v', `${resolve(buildDir)}:/usr/share/nginx/html:ro`, '-v', `${conf}:/etc/nginx/conf.d/default.conf:ro`, 'nginx:1.29-alpine');
}
function hostUrl(name: string, port: number, path: string): string {
  const mapped = docker('port', name, String(port)).split('\n')[0] ?? '';
  return `http://${mapped}${path}`;
}
async function waitHttp(url: string, timeoutMs = 30_000): Promise<void> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.status < 500) return;
    } catch { /* not up yet */ }
    if (Date.now() > end) throw new Error(`${url} did not come up`);
    await new Promise((r) => setTimeout(r, 500));
  }
}
async function waitInNetwork(container: string, url: string): Promise<void> {
  // Probe from a throwaway container on the episode network.
  const end = Date.now() + 40_000;
  for (;;) {
    try {
      docker('run', '--rm', '--network', NET, ADAPTER_IMAGE, 'node', '-e', `fetch(${JSON.stringify(url)}).then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))`);
      return;
    } catch { /* not up yet */ }
    if (Date.now() > end) throw new Error(`${container}: ${url} did not come up on ${NET}`);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

function brief(id: string, app: string, track: string, url: string, roles: Brief['roles'], extra: Partial<Brief> = {}): Brief {
  return { episode_id: id, bench_version: '0.1.0-b0', app, track, targets: [{ name: app, url }], roles, budget: { wall_time_s: 240 }, ...extra };
}
const expenseRoles: Brief['roles'] = [{ role: 'viewer', accounts: [VIEWER] }, { role: 'editor', accounts: [EDITOR] }];
const expenseEnv = { QA_BENCH_VIEWER_ACCOUNTS: `${VIEWER.username}:${VIEWER.password}`, QA_BENCH_EDITOR_ACCOUNTS: `${EDITOR.username}:${EDITOR.password}` };

function record(phase: string, app: string, name: string, expect: Result['expect'], file: FindingsFile, seconds: number): void {
  const errors = check('findings', file);
  const n = file.findings.length;
  const ok = errors.length === 0 && (expect === 'none' ? n === 0 : expect === 'some' ? n > 0 : true);
  results.push({
    phase, app, name, expect, findings: n, valid: errors.length === 0, seconds, ok,
    summary: [...file.findings.map((f) => `${f.category} ${f.where.route} ${f.where.selector ?? '-'} | ${f.description.slice(0, 140)}`), ...errors.map((e) => `SCHEMA: ${e}`)],
  });
  process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${phase} ${app} ${name}: ${n} finding(s)${errors.length ? ' (schema errors)' : ''} in ${seconds.toFixed(0)} s\n`);
}

async function nativeCase(app: string, name: string, expect: Result['expect'], b: Brief): Promise<void> {
  const dir = join(OUT, 'native', `${app}-${name}`);
  rmSync(dir, { recursive: true, force: true });
  const t0 = Date.now();
  await runEpisode(b, { findingsPath: join(dir, 'findings.json'), evidenceDir: join(dir, 'evidence'), log: () => undefined });
  record('native', app, name, expect, JSON.parse(readFileSync(join(dir, 'findings.json'), 'utf8')) as FindingsFile, (Date.now() - t0) / 1000);
}

function dockerCase(app: string, name: string, expect: Result['expect'], b: Brief): void {
  const dir = join(OUT, 'docker', `${app}-${name}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'brief'), { recursive: true });
  mkdirSync(join(dir, 'out'), { recursive: true });
  writeFileSync(join(dir, 'brief', 'brief.json'), JSON.stringify({ ...b, out: { findings: '/bench/out/findings.json', evidence_dir: '/bench/out/evidence' } }, null, 2));
  const t0 = Date.now();
  let log: string;
  try {
    log = execFileSync('docker', ['run', '--rm', '--name', 'qab-pw-adapter-it', '--network', NET, '-v', `${join(dir, 'brief')}:/bench/brief:ro`, '-v', `${join(dir, 'out')}:/bench/out`, ADAPTER_IMAGE],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: (b.budget.wall_time_s + 60) * 1000 });
  } catch (error) {
    log = String((error as { stdout?: string }).stdout ?? error);
    process.stdout.write(`adapter container failed for ${app} ${name}: ${String(error).split('\n')[0]}\n`);
  }
  writeFileSync(join(dir, 'adapter.log'), log);
  record('docker', app, name, expect, JSON.parse(readFileSync(join(dir, 'out', 'findings.json'), 'utf8')) as FindingsFile, (Date.now() - t0) / 1000);
}

async function internetPages(base: string): Promise<string[]> {
  const html = await (await fetch(base)).text();
  return ['/', ...[...html.matchAll(/href='(\/[^']*)'/g)].map((m) => m[1] as string)];
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const started: string[] = [];
  try {
    if (native) {
      if (want('expense')) {
        for (const defect of ['', ...EXPENSE_DEFECTS, 'relabel']) {
          const name = defect || 'clean';
          const env = defect === 'relabel' ? { ...expenseEnv, VARIANT: 'relabel' } : { ...expenseEnv, DEFECT: defect };
          started.push(startApp('qab-pw-it-expense', EXPENSE_IMAGE, 3000, env));
          const url = hostUrl('qab-pw-it-expense', 3000, '/expenses');
          await waitHttp(url.replace('/expenses', '/login'));
          await nativeCase('expense-app', name === 'relabel' ? 'VARIANT=relabel' : name, name === 'clean' ? 'none' : name === 'relabel' ? 'report' : 'some',
            brief(`it-expense-${name}`, 'expense-app', 'regression', url, expenseRoles));
        }
      }
      if (want('swag')) {
        started.push(startApp('qab-pw-it-swag', SWAG_IMAGE, 80, { QA_BENCH_ACCOUNTS: `${CUSTOMER.username}:${CUSTOMER.password}` }));
        const url = hostUrl('qab-pw-it-swag', 80, '/');
        await waitHttp(url);
        await nativeCase('swag-labs', 'bench-clean', 'none', brief('it-swag-clean', 'swag-labs', 'regression', url, [{ role: 'customer', accounts: [CUSTOMER] }]));
        const build = process.env.SWAG_UPSTREAM_BUILD;
        if (build) {
          startUpstreamSwag('qab-pw-it-swag-upstream', build);
          started.push('qab-pw-it-swag-upstream');
          const up = hostUrl('qab-pw-it-swag-upstream', 80, '/');
          await waitHttp(up);
          for (const user of ['standard_user', ...SWAG_FAULTY]) {
            await nativeCase('swag-labs', `upstream-${user}`, user === 'standard_user' ? 'none' : 'some',
              brief(`it-swag-${user}`, 'swag-labs', 'regression', up, [{ role: 'customer', accounts: [{ username: user, password: 'secret_sauce' }] }]));
          }
        } else {
          process.stdout.write('skip upstream swag users: set SWAG_UPSTREAM_BUILD to a static build of sample-app-web\n');
        }
      }
      if (want('internet')) {
        started.push(startApp('qab-pw-it-internet', INTERNET_IMAGE, 5000, {}));
        const url = hostUrl('qab-pw-it-internet', 5000, '/');
        await waitHttp(url);
        await nativeCase('the-internet', 'all-pages', 'report', brief('it-internet', 'the-internet', 'noise', url, [], {
          pages: await internetPages(url), rules: { methods: ['GET', 'HEAD'], forms: false, robots_txt: 'honour', min_interval_ms: 200 },
        }));
      }
    }
    if (dockerPhase) {
      if (!args.includes('--no-build')) {
        execFileSync('docker', ['build', '-t', ADAPTER_IMAGE, ...buildSecretArgs(), HERE], { stdio: ['ignore', 'ignore', 'inherit'] });
      }
      quietDocker('network', 'create', NET);
      if (want('expense')) {
        for (const defect of ['', 'wrong_total']) {
          const name = defect || 'clean';
          started.push(startApp('qab-pw-it-net-expense', EXPENSE_IMAGE, 3000, { ...expenseEnv, DEFECT: defect }, NET));
          await waitInNetwork('qab-pw-it-net-expense', 'http://app:3000/login');
          dockerCase('expense-app', name, name === 'clean' ? 'none' : 'some', brief(`it-docker-expense-${name}`, 'expense-app', 'regression', 'http://app:3000/expenses', expenseRoles));
          quietDocker('rm', '-f', 'qab-pw-it-net-expense');
        }
      }
      if (want('swag')) {
        started.push(startApp('qab-pw-it-net-swag', SWAG_IMAGE, 80, { QA_BENCH_ACCOUNTS: `${CUSTOMER.username}:${CUSTOMER.password}` }, NET));
        await waitInNetwork('qab-pw-it-net-swag', 'http://app:80/');
        dockerCase('swag-labs', 'bench-clean', 'none', brief('it-docker-swag-clean', 'swag-labs', 'regression', 'http://app:80/', [{ role: 'customer', accounts: [CUSTOMER] }]));
        quietDocker('rm', '-f', 'qab-pw-it-net-swag');
      }
      if (want('internet')) {
        started.push(startApp('qab-pw-it-net-internet', INTERNET_IMAGE, 5000, {}, NET));
        await waitInNetwork('qab-pw-it-net-internet', 'http://app:5000/');
        dockerCase('the-internet', 'pages', 'report', brief('it-docker-internet', 'the-internet', 'noise', 'http://app:5000/', [], {
          pages: ['/', '/broken_images', '/javascript_error', '/status_codes', '/tables', '/checkboxes', '/dynamic_content', '/typos'],
          rules: { methods: ['GET', 'HEAD'], forms: false, robots_txt: 'honour', min_interval_ms: 200 },
        }));
        quietDocker('rm', '-f', 'qab-pw-it-net-internet');
      }
    }
  } finally {
    for (const name of new Set(started)) quietDocker('rm', '-f', name);
    if (dockerPhase) quietDocker('network', 'rm', NET);
  }
  const lines = ['| phase | app | case | expect | findings | schema | s |', '|---|---|---|---|---|---|---|',
    ...results.map((r) => `| ${r.phase} | ${r.app} | ${r.name} | ${r.expect} | ${r.findings} | ${r.valid ? 'ok' : 'INVALID'} | ${r.seconds.toFixed(0)} |`)];
  const detail = results.flatMap((r) => [`\n${r.phase} ${r.app} ${r.name}:`, ...r.summary.map((s) => `  - ${s}`)]);
  writeFileSync(join(OUT, 'summary.md'), `${lines.join('\n')}\n${detail.join('\n')}\n`);
  process.stdout.write(`\n${lines.join('\n')}\n\nDetails: ${join(OUT, 'summary.md')}\n`);
  process.exitCode = results.every((r) => r.ok) ? 0 : 1;
}

function buildSecretArgs(): string[] {
  const ca = process.env.QAB_EXTRA_CA;
  if (!ca) return [];
  const proxy = ['HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY'].flatMap((k) => (process.env[k] ? ['--build-arg', `${k}=${process.env[k]}`] : []));
  return ['--network', 'host', '--secret', `id=extra_ca,src=${ca}`, ...proxy];
}

await main();
