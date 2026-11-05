// The runner (HANDOFF step 5): bring up an episode on its own docker network, hand the adapter a brief, collect
// its findings within the budget, and always tear down. See harness/runner/README.md for the sealing model.
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import YAML from 'yaml';
import {
  BENCH_VERSION,
  type AdapterManifest, type AppConfig, type Brief, type Category, type Episode, type EpisodeStatus, type FindingsFile, type Track,
} from '../../../lib/contracts.ts';
import { REPO_ROOT, readData, writeJson } from '../../../lib/io.ts';
import { assertValid, check } from '../../../lib/schemas.ts';
import { loadApp } from '../../generator/src/apps.ts';
import { DEFAULT_APPS_ROOT, DEFAULT_EPISODES_ROOT, DEFAULT_TRACKS_ROOT } from '../../generator/src/index.ts';
import { buildBrief } from './brief.ts';
import {
  adapterRunArgs, buildArgs, composeBase, composeDownArgs, composeUpArgs, dockerEnv, envFileText, hostPortOverride,
  parsePublishedPort, projectName, redactArgs,
} from './docker.ts';
import { realExec, type Exec } from './exec.ts';

export const DEFAULT_RUNS_ROOT = join(REPO_ROOT, 'runs');
export const DEFAULT_ADAPTERS_ROOT = join(REPO_ROOT, 'harness', 'adapters');
export const DEFAULT_GRACE_S = 30;

const CATEGORY_ORDER: Category[] = [
  'functional', 'consistency', 'permission', 'error-handling', 'visual', 'copy', 'a11y', 'perf', 'usability', 'email',
  'security-hygiene', 'l10n',
];

export interface RunnerOptions {
  appsRoot?: string;
  episodesRoot?: string;
  /** Held-out episodes root (default env QA_BENCH_HELDOUT_DIR); searched after episodesRoot. */
  heldoutRoot?: string;
  runsRoot?: string;
  adaptersRoot?: string;
  tracksRoot?: string;
  /** Seconds past budget.wall_time_s before the adapter is killed (status timeout). */
  graceS?: number;
  /** Compose project and container name prefix (default 'qab'). */
  projectPrefix?: string;
  /** Manual adapters: a findings file (one episode) or a folder of <episode-id>.json / <episode-id>/findings.json. */
  findingsImport?: string;
  /** Host environment (default process.env): QA_BENCH_ALLOW_LIVE, QA_BENCH_BUILD_CA, proxies, passthrough values. */
  env?: NodeJS.ProcessEnv;
  exec?: Exec;
  log?: (line: string) => void;
}

export interface RunSelection {
  adapter: string;
  track?: string;
  episodes?: string[];
  runId?: string;
  parallel?: number;
  limit?: number;
}

export interface RunnerJson {
  episode_id: string;
  status: EpisodeStatus;
  status_reason?: string;
  wall_time_s: number;
  started_at: string;
  finished_at: string;
  adapter_exit_code?: number;
}

export interface LoadedAdapter {
  name: string;
  dir: string;
  manifest: AdapterManifest;
}

export interface AppBuildResult {
  ok: boolean;
  images: string[];
  reason?: string;
}

export interface RunContext {
  runId: string;
  runDir: string;
  adapter: LoadedAdapter;
  adapterImage?: string;
  /** Set when the adapter image could not be built: every episode is then adapter_error. */
  adapterError?: string;
  appsRoot: string;
  roots: string[];
  tracksRoot: string;
  graceS: number;
  projectPrefix: string;
  findingsImport?: string;
  env: NodeJS.ProcessEnv;
  exec: Exec;
  log: (line: string) => void;
  appImages: Map<string, Promise<AppBuildResult>>;
  categories: Map<string, Category[] | undefined>;
}

export interface RunSummary {
  runId: string;
  runDir: string;
  results: RunnerJson[];
}

// ---------------------------------------------------------------------------------------------------------------
// Loading

export function loadAdapter(name: string, adaptersRoot: string = DEFAULT_ADAPTERS_ROOT): LoadedAdapter {
  const dir = join(adaptersRoot, name);
  const file = join(dir, 'adapter.json');
  if (!existsSync(file)) throw new Error(`no adapter '${name}' (${file} missing)`);
  const manifest = assertValid<AdapterManifest>('adapter', readData(file), file);
  if (manifest.name !== name) throw new Error(`${file}: name '${manifest.name}' does not match folder '${name}'`);
  return { name, dir, manifest };
}

export function episodeRoots(opts: Pick<RunnerOptions, 'episodesRoot' | 'heldoutRoot' | 'env'>): string[] {
  const env = opts.env ?? process.env;
  const roots = [opts.episodesRoot ?? DEFAULT_EPISODES_ROOT];
  const held = opts.heldoutRoot ?? env.QA_BENCH_HELDOUT_DIR;
  if (held) roots.push(held);
  return roots;
}

/** Folder holding episode.json for an episode id, searching every track folder of every root. */
export function findEpisodeDir(id: string, roots: string[]): string | undefined {
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const track of readdirSync(root).sort()) {
      const dir = join(root, track, id);
      if (existsSync(join(dir, 'episode.json'))) return dir;
    }
  }
  return undefined;
}

export function listTrackEpisodes(track: string, roots: string[]): string[] {
  const ids = new Set<string>();
  for (const root of roots) {
    const dir = join(root, track);
    if (!existsSync(dir)) continue;
    for (const id of readdirSync(dir)) if (existsSync(join(dir, id, 'episode.json'))) ids.add(id);
  }
  return [...ids].sort();
}

function findComposeFile(appDir: string): string | undefined {
  return ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'].map((f) => join(appDir, f)).find((p) => existsSync(p));
}

function loadAppConfig(appsRoot: string, app: string): AppConfig | undefined {
  const file = join(appsRoot, app, 'app.yaml');
  if (!existsSync(file)) return undefined;
  return assertValid<AppConfig>('app', readData(file), file);
}

function loadTrackFile(tracksRoot: string, id: string): Track | undefined {
  for (const ext of ['yaml', 'yml']) {
    const file = join(tracksRoot, `${id}.${ext}`);
    if (existsSync(file)) return assertValid<Track>('track', readData(file), file);
  }
  return undefined;
}

/**
 * The track's category scope: every category any label of the track's apps can carry (defects, changes and
 * baselines alike). It is the same for every episode of the track, so it says nothing about what is switched on.
 */
export function trackCategories(track: Track, appsRoot: string): Category[] | undefined {
  const seen = new Set<Category>();
  for (const ta of track.apps) {
    const dir = join(appsRoot, ta.app);
    if (!existsSync(join(dir, 'app.yaml'))) continue;
    const app = loadApp(dir, ta.app);
    const listed = (spec: '*' | string[] | undefined, id: string): boolean => spec === undefined || spec === '*' || spec.includes(id);
    for (const l of app.mutations) if (listed(ta.mutations, l.id)) seen.add(l.category);
    for (const l of app.changes) if (listed(ta.changes, l.id)) seen.add(l.category);
    for (const l of app.baseline) seen.add(l.category);
  }
  const out = CATEGORY_ORDER.filter((c) => seen.has(c));
  return out.length ? out : undefined;
}

function utcStamp(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

function tail(text: string, n = 600): string {
  const t = text.trim();
  return t.length > n ? '…' + t.slice(-n) : t;
}

/** Remove every secret-ish value (env values, passwords) from a message before it is logged or recorded. */
function redactor(episode: Episode | undefined): (text: string) => string {
  const secrets = new Set<string>();
  if (episode) {
    for (const a of episode.accounts) secrets.add(a.password);
    for (const v of Object.values(episode.env)) for (const part of v.split(/[,:]/)) if (part.length >= 6) secrets.add(part);
  }
  const list = [...secrets].sort((a, b) => b.length - a.length);
  return (text) => list.reduce((t, s) => t.split(s).join('***'), text);
}

// ---------------------------------------------------------------------------------------------------------------
// Images

interface ComposeService { image?: string; build?: string | { context?: string; dockerfile?: string } }

/**
 * Build every image an app's compose file builds (normally one, `qa-bench-app-<app>:local`), so episodes can
 * `compose up --no-build`. Services that only name an image are pulled by compose at `up`.
 */
export async function buildAppImage(
  app: string,
  opts: Pick<RunnerOptions, 'appsRoot' | 'env' | 'exec' | 'log'> & { logFile?: string } = {},
): Promise<AppBuildResult> {
  const appsRoot = opts.appsRoot ?? DEFAULT_APPS_ROOT;
  const env = opts.env ?? process.env;
  const exec = opts.exec ?? realExec;
  const log = opts.log ?? (() => undefined);
  const appDir = join(appsRoot, app);
  let config: AppConfig | undefined;
  try {
    config = loadAppConfig(appsRoot, app);
  } catch (e) {
    return { ok: false, images: [], reason: (e as Error).message };
  }
  if (!config) return { ok: false, images: [], reason: `app '${app}' not found (no ${join(appDir, 'app.yaml')})` };
  const missing = (config.available?.requires_env ?? []).filter((k) => !env[k]);
  if (missing.length) return { ok: false, images: [], reason: `app '${app}' needs env ${missing.join(', ')}` };
  const composeFile = findComposeFile(appDir);
  if (!composeFile) return { ok: false, images: [], reason: `app '${app}' has no compose.yaml` };

  if (config.available?.fetch) {
    const script = resolve(appDir, config.available.fetch);
    log(`fetch ${app}: ${script}`);
    const r = await exec('bash', [script], { cwd: appDir, env, logFile: opts.logFile });
    if (r.code !== 0) return { ok: false, images: [], reason: `fetch script failed (exit ${r.code ?? r.error}): ${tail(r.stderr)}` };
  }

  const compose = YAML.parse(readFileSync(composeFile, 'utf8')) as { services?: Record<string, ComposeService> };
  const specs = new Map<string, { context: string; dockerfile: string }>();
  for (const [name, svc] of Object.entries(compose.services ?? {})) {
    if (!svc.build) continue;
    if (!svc.image) return { ok: false, images: [], reason: `compose service '${name}' has build: but no image: (needed for --no-build)` };
    const b = typeof svc.build === 'string' ? { context: svc.build } : svc.build;
    const context = resolve(appDir, b.context ?? '.');
    specs.set(svc.image, { context, dockerfile: resolve(context, b.dockerfile ?? 'Dockerfile') });
  }
  const images: string[] = [];
  for (const [tag, spec] of specs) {
    const { args, env: benv } = buildArgs({ tag, ...spec }, env);
    log(`build ${app}: docker ${redactArgs(args)}`);
    const r = await exec('docker', args, { env: benv, logFile: opts.logFile });
    if (r.code !== 0) return { ok: false, images, reason: `docker build ${tag} failed (exit ${r.code ?? r.error}): ${tail(r.stderr)}` };
    images.push(tag);
  }
  return { ok: true, images };
}

export function adapterImageTag(adapter: LoadedAdapter): string {
  return `qa-bench-adapter-${adapter.name}:${adapter.manifest.version}`.toLowerCase().replace(/[^a-z0-9_.:/-]/g, '-');
}

export async function buildAdapterImage(
  adapter: LoadedAdapter,
  opts: Pick<RunnerOptions, 'env' | 'exec' | 'log'> & { logFile?: string } = {},
): Promise<{ ok: boolean; image: string; reason?: string }> {
  const image = adapterImageTag(adapter);
  if (adapter.manifest.mode !== 'container' || !adapter.manifest.build) return { ok: false, image, reason: 'not a container adapter' };
  const env = opts.env ?? process.env;
  const exec = opts.exec ?? realExec;
  const { args, env: benv } = buildArgs({ tag: image, context: adapter.dir, dockerfile: resolve(adapter.dir, adapter.manifest.build) }, env);
  opts.log?.(`build adapter ${adapter.name}: docker ${redactArgs(args)}`);
  const r = await exec('docker', args, { env: benv, logFile: opts.logFile });
  if (r.code !== 0) return { ok: false, image, reason: `docker build ${image} failed (exit ${r.code ?? r.error}): ${tail(r.stderr)}` };
  return { ok: true, image };
}

// ---------------------------------------------------------------------------------------------------------------
// Episodes

export function createRunContext(adapterName: string, runId: string, opts: RunnerOptions = {}): RunContext {
  const runsRoot = opts.runsRoot ?? DEFAULT_RUNS_ROOT;
  return {
    runId,
    runDir: join(runsRoot, runId),
    adapter: loadAdapter(adapterName, opts.adaptersRoot),
    appsRoot: opts.appsRoot ?? DEFAULT_APPS_ROOT,
    roots: episodeRoots(opts),
    tracksRoot: opts.tracksRoot ?? DEFAULT_TRACKS_ROOT,
    graceS: opts.graceS ?? DEFAULT_GRACE_S,
    projectPrefix: opts.projectPrefix ?? 'qab',
    findingsImport: opts.findingsImport,
    env: opts.env ?? process.env,
    exec: opts.exec ?? realExec,
    log: opts.log ?? ((line) => console.log(line)),
    appImages: new Map(),
    categories: new Map(),
  };
}

function ensureAppImage(ctx: RunContext, app: string): Promise<AppBuildResult> {
  let p = ctx.appImages.get(app);
  if (!p) {
    mkdirSync(ctx.runDir, { recursive: true });
    p = buildAppImage(app, { appsRoot: ctx.appsRoot, env: ctx.env, exec: ctx.exec, log: ctx.log, logFile: join(ctx.runDir, `build-${app}.log`) });
    ctx.appImages.set(app, p);
  }
  return p;
}

function categoriesFor(ctx: RunContext, track: Track | undefined): Category[] | undefined {
  if (!track) return undefined;
  if (!ctx.categories.has(track.id)) {
    let cats: Category[] | undefined;
    try {
      cats = trackCategories(track, ctx.appsRoot);
    } catch {
      cats = undefined;
    }
    ctx.categories.set(track.id, cats);
  }
  return ctx.categories.get(track.id);
}

/** Validate out/findings.json for an episode. */
export function checkFindings(file: string, episodeId: string): { ok: boolean; reason?: string; findings?: FindingsFile } {
  if (!existsSync(file)) return { ok: false, reason: 'out/findings.json missing' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    return { ok: false, reason: `findings.json is not JSON: ${(e as Error).message}` };
  }
  const errors = check('findings', parsed);
  if (errors.length) return { ok: false, reason: `findings.json invalid: ${errors.slice(0, 3).join('; ')}` };
  const f = parsed as FindingsFile;
  if (f.episode_id !== episodeId) return { ok: false, reason: `findings.json is for '${f.episode_id}', not '${episodeId}'` };
  return { ok: true, findings: f };
}

function prepareOut(epDir: string): { briefDir: string; outDir: string } {
  const briefDir = join(epDir, 'brief');
  const outDir = join(epDir, 'out');
  rmSync(briefDir, { recursive: true, force: true });
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(briefDir, { recursive: true });
  mkdirSync(join(outDir, 'evidence'), { recursive: true });
  chmodSync(briefDir, 0o755);
  // The adapter's user is not the runner's: out/ must be writable by anyone in the container.
  chmodSync(outDir, 0o777);
  chmodSync(join(outDir, 'evidence'), 0o777);
  return { briefDir, outDir };
}

function writeBrief(briefDir: string, brief: Brief): void {
  const file = join(briefDir, 'brief.json');
  writeJson(file, brief);
  chmodSync(file, 0o644);
}

interface AdapterOutcome { status: EpisodeStatus; reason?: string; exitCode?: number; wall: number }

async function runAdapterContainer(ctx: RunContext, episodeId: string, epDir: string, dirs: { briefDir: string; outDir: string }, network: string, brief: Brief, containerName: string): Promise<AdapterOutcome> {
  if (ctx.adapterError || !ctx.adapterImage) return { status: 'adapter_error', reason: ctx.adapterError ?? 'adapter image not built', wall: 0 };
  const m = ctx.adapter.manifest;
  const passthrough = m.env_passthrough ?? [];
  const args = adapterRunArgs({
    containerName, image: ctx.adapterImage, network, briefDir: resolve(dirs.briefDir), outDir: resolve(dirs.outDir),
    envPassthrough: passthrough, command: m.command,
  });
  const logFile = join(epDir, 'adapter.log');
  writeFileSync(logFile, '');
  ctx.log(`${episodeId}: docker ${redactArgs(args)}`);
  const limitMs = (brief.budget.wall_time_s + ctx.graceS) * 1000;
  const t0 = Date.now();
  const r = await ctx.exec('docker', args, {
    env: dockerEnv(ctx.env, passthrough),
    timeoutMs: limitMs,
    onTimeout: () => ctx.exec('docker', ['kill', containerName], { env: dockerEnv(ctx.env) }),
    logFile,
  });
  const wall = Math.round((Date.now() - t0) / 10) / 100;
  if (r.error) return { status: 'adapter_error', reason: `could not start docker: ${r.error}`, wall };
  if (r.timedOut) return { status: 'timeout', reason: `killed after ${brief.budget.wall_time_s}s budget + ${ctx.graceS}s grace`, exitCode: r.code ?? undefined, wall };
  const exitCode = r.code ?? -1;
  const f = checkFindings(join(dirs.outDir, 'findings.json'), episodeId);
  if (f.ok) return { status: 'scored', exitCode, wall, ...(exitCode !== 0 ? { reason: `adapter exited ${exitCode}; its findings were collected` } : {}) };
  if (exitCode !== 0) return { status: 'adapter_error', reason: `adapter exited ${exitCode}; ${f.reason}`, exitCode, wall };
  return { status: 'invalid_findings', reason: f.reason, exitCode, wall };
}

function importFindings(ctx: RunContext, episodeId: string, outDir: string): AdapterOutcome {
  const src = ctx.findingsImport;
  if (!src) return { status: 'skipped', reason: 'manual adapter: brief written; import findings with --findings', wall: 0 };
  let file: string | undefined = src;
  if (existsSync(src) && statSync(src).isDirectory()) {
    file = [join(src, `${episodeId}.json`), join(src, episodeId, 'findings.json')].find((p) => existsSync(p));
  }
  if (!file || !existsSync(file)) return { status: 'skipped', reason: `manual adapter: no findings for ${episodeId} under ${src}`, wall: 0 };
  copyFileSync(file, join(outDir, 'findings.json'));
  const f = checkFindings(join(outDir, 'findings.json'), episodeId);
  return f.ok ? { status: 'scored', wall: f.findings?.wall_time_s ?? 0 } : { status: 'invalid_findings', reason: f.reason, wall: 0 };
}

/** Run one episode end to end and write <runDir>/<episode>/runner.json. Never throws for episode-level problems. */
export async function runEpisode(ctx: RunContext, episodeId: string): Promise<RunnerJson> {
  const started = new Date();
  const epDir = join(ctx.runDir, episodeId);
  mkdirSync(epDir, { recursive: true });
  const containerName = projectName(ctx.projectPrefix, ctx.runId, episodeId) + '-adapter';
  const project = projectName(ctx.projectPrefix, ctx.runId, episodeId);
  const envFile = join(epDir, 'compose.env');
  const dEnv = dockerEnv(ctx.env);
  let episode: Episode | undefined;
  let composeArgs: string[] | undefined;
  let adapterStarted = false;
  let outcome: AdapterOutcome = { status: 'skipped', reason: 'not run', wall: 0 };
  let redact = redactor(undefined);

  try {
    const dir = findEpisodeDir(episodeId, ctx.roots);
    if (!dir) throw new SkipError(`episode '${episodeId}' not found under ${ctx.roots.join(', ')}`);
    episode = assertValid<Episode>('episode', readData(join(dir, 'episode.json')), join(dir, 'episode.json'));
    redact = redactor(episode);
    const track = loadTrackFile(ctx.tracksRoot, episode.track);
    const categories = categoriesFor(ctx, track);
    const manual = ctx.adapter.manifest.mode === 'manual';
    const hostNet = ctx.adapter.manifest.network === 'host';

    if (episode.live) {
      if (ctx.env.QA_BENCH_ALLOW_LIVE !== '1') throw new SkipError('live episode: set QA_BENCH_ALLOW_LIVE=1 to run it (never in CI)');
      const dirs = prepareOut(epDir);
      const brief = buildBrief({ episode, track, targets: [{ name: episode.live.name, url: episode.live.url }], categories });
      writeBrief(dirs.briefDir, brief);
      if (manual) outcome = importFindings(ctx, episodeId, dirs.outDir);
      else {
        adapterStarted = true;
        outcome = await runAdapterContainer(ctx, episodeId, epDir, dirs, hostNet ? 'host' : 'bridge', brief, containerName);
      }
      return finish();
    }

    const app = loadAppConfig(ctx.appsRoot, episode.app);
    if (!app) throw new SkipError(`app '${episode.app}' not found under ${ctx.appsRoot}`);
    const appDir = join(ctx.appsRoot, episode.app);
    const composeFile = findComposeFile(appDir);
    if (!composeFile) throw new SkipError(`app '${episode.app}' has no compose.yaml`);
    const missing = (app.available?.requires_env ?? []).filter((k) => !ctx.env[k]);
    if (missing.length) throw new SkipError(`app '${episode.app}' needs env ${missing.join(', ')}`);

    if (manual) {
      // A person runs the manual adapter; bringing the app up for them is not part of B0.
      const dirs = prepareOut(epDir);
      const targets = app.targets.map((t) => ({ name: t.name, url: `http://${t.service}:${t.port}${t.path ?? '/'}` }));
      writeBrief(dirs.briefDir, buildBrief({ episode, app, track, targets, categories }));
      outcome = importFindings(ctx, episodeId, dirs.outDir);
      return finish();
    }

    const built = await ensureAppImage(ctx, episode.app);
    if (!built.ok) throw new SkipError(`app image unavailable: ${built.reason}`);

    writeFileSync(envFile, envFileText(episode.env), { mode: 0o600 });
    chmodSync(envFile, 0o600);
    const files = [composeFile];
    if (hostNet) {
      const override = join(epDir, 'compose.override.yaml');
      writeFileSync(override, hostPortOverride(app.targets));
      files.push(override);
    }
    const base = composeBase(project, files, envFile);
    composeArgs = base;
    ctx.log(`${episodeId}: docker ${redactArgs(composeUpArgs(base))}`);
    const up = await ctx.exec('docker', composeUpArgs(base), { env: dEnv, cwd: appDir, logFile: join(epDir, 'compose.log') });
    if (up.code !== 0) throw new SkipError(`compose up failed (exit ${up.code ?? up.error}): ${redact(tail(up.stderr))}`);

    const targets: { name: string; url: string }[] = [];
    let network = 'host';
    if (hostNet) {
      for (const t of app.targets) {
        const r = await ctx.exec('docker', [...base, 'port', t.service, String(t.port)], { env: dEnv, cwd: appDir });
        const port = parsePublishedPort(r.stdout);
        if (r.code !== 0 || !port) throw new SkipError(`could not read the published port of ${t.service}:${t.port}`);
        targets.push({ name: t.name, url: `http://127.0.0.1:${port}${t.path ?? '/'}` });
      }
    } else {
      for (const t of app.targets) targets.push({ name: t.name, url: `http://${t.service}:${t.port}${t.path ?? '/'}` });
      network = await episodeNetwork(ctx, base, app.targets[0]!.service, project, appDir);
    }

    const dirs = prepareOut(epDir);
    const brief = buildBrief({ episode, app, track, targets, categories });
    writeBrief(dirs.briefDir, brief);
    adapterStarted = true;
    outcome = await runAdapterContainer(ctx, episodeId, epDir, dirs, network, brief, containerName);
    return finish();
  } catch (e) {
    outcome = e instanceof SkipError
      ? { status: 'skipped', reason: e.message, wall: 0 }
      : { status: 'skipped', reason: `runner error: ${redact((e as Error).message)}`, wall: outcome.wall };
    return finish();
  } finally {
    await teardown();
  }

  function finish(): RunnerJson {
    const r: RunnerJson = {
      episode_id: episodeId,
      status: outcome.status,
      ...(outcome.reason ? { status_reason: redact(outcome.reason) } : {}),
      wall_time_s: outcome.wall,
      started_at: started.toISOString(),
      finished_at: new Date().toISOString(),
      ...(outcome.exitCode !== undefined ? { adapter_exit_code: outcome.exitCode } : {}),
    };
    writeJson(join(epDir, 'runner.json'), r);
    ctx.log(`${episodeId}: ${r.status}${r.status_reason ? ` (${r.status_reason})` : ''}`);
    return r;
  }

  async function teardown(): Promise<void> {
    if (adapterStarted) await ctx.exec('docker', ['rm', '-f', containerName], { env: dEnv }).catch(() => undefined);
    if (composeArgs) {
      const down = await ctx.exec('docker', composeDownArgs(composeArgs), { env: dEnv, logFile: join(epDir, 'compose.log') });
      if (down.code !== 0) ctx.log(`${episodeId}: WARNING compose down failed (exit ${down.code ?? down.error}); project ${project} may be left behind`);
    }
    rmSync(envFile, { force: true });
  }
}

class SkipError extends Error {}

async function episodeNetwork(ctx: RunContext, base: string[], service: string, project: string, cwd: string): Promise<string> {
  const env = dockerEnv(ctx.env);
  const ps = await ctx.exec('docker', [...base, 'ps', '-q', service], { env, cwd });
  const id = ps.stdout.trim().split('\n')[0];
  if (ps.code === 0 && id) {
    const ins = await ctx.exec('docker', ['inspect', '-f', '{{json .NetworkSettings.Networks}}', id], { env });
    if (ins.code === 0) {
      try {
        const names = Object.keys(JSON.parse(ins.stdout.trim()) as Record<string, unknown>).sort();
        const preferred = names.find((n) => n === `${project}_default`) ?? names[0];
        if (preferred) return preferred;
      } catch {
        // fall through to the compose default
      }
    }
  }
  return `${project}_default`;
}

// ---------------------------------------------------------------------------------------------------------------
// Runs

async function pool<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, worker));
  return out;
}

/** Run a set of episodes with one adapter: run.json, one folder per episode, sequential unless parallel > 1. */
export async function runEpisodes(sel: RunSelection, opts: RunnerOptions = {}): Promise<RunSummary> {
  const roots = episodeRoots(opts);
  let ids = sel.episodes?.length ? [...sel.episodes] : sel.track ? listTrackEpisodes(sel.track, roots) : [];
  if (!sel.episodes?.length && !sel.track) throw new Error('give a track or a list of episode ids');
  if (sel.limit !== undefined) ids = ids.slice(0, sel.limit);
  if (!ids.length) throw new Error(sel.track ? `no episodes for track '${sel.track}' under ${roots.join(', ')} (run generate first)` : 'no episodes');
  if (new Set(ids).size !== ids.length) throw new Error('an episode id is listed twice');

  const runId = sel.runId ?? `${sel.adapter}-${utcStamp(new Date())}`;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(runId)) throw new Error(`run id '${runId}' must be letters, digits, '.', '_' or '-'`);
  const ctx = createRunContext(sel.adapter, runId, opts);
  if (existsSync(join(ctx.runDir, 'run.json'))) throw new Error(`run ${runId} already exists at ${ctx.runDir}`);
  mkdirSync(ctx.runDir, { recursive: true });

  // Tracks and seeds, for the report.
  const tracks = new Set<string>();
  const seeds: Record<string, number> = {};
  const live = new Set<string>();
  const apps = new Set<string>();
  for (const id of ids) {
    const dir = findEpisodeDir(id, roots);
    if (!dir) continue;
    const ep = readData<Episode>(join(dir, 'episode.json'));
    tracks.add(ep.track);
    if (ep.live) live.add(id);
    else apps.add(ep.app);
  }
  for (const t of [...tracks].sort()) {
    const track = loadTrackFile(ctx.tracksRoot, t);
    if (track) seeds[t] = track.episodes.seed;
  }
  const runJson: Record<string, unknown> = {
    id: runId,
    bench_version: BENCH_VERSION,
    adapter: sel.adapter,
    started_at: new Date().toISOString(),
    tracks: [...tracks].sort(),
    episodes: ids,
    seeds,
  };
  writeJson(join(ctx.runDir, 'run.json'), runJson);

  if (ctx.adapter.manifest.mode === 'container') {
    const info = await ctx.exec('docker', ['info', '--format', '{{.ServerVersion}}'], { env: dockerEnv(ctx.env) });
    if (info.code !== 0) throw new Error(`docker is not available: ${tail(info.stderr || info.error || '')}`);
  }
  if (ctx.adapter.manifest.mode === 'container') {
    const b = await buildAdapterImage(ctx.adapter, { env: ctx.env, exec: ctx.exec, log: ctx.log, logFile: join(ctx.runDir, `build-adapter-${ctx.adapter.name}.log`) });
    if (b.ok) ctx.adapterImage = b.image;
    else ctx.adapterError = b.reason;
  }
  if (ctx.adapter.manifest.mode === 'container' && !ctx.adapterError) {
    for (const app of [...apps].sort()) await ensureAppImage(ctx, app);
  }

  const results = await pool(ids, sel.parallel ?? 1, (id) => runEpisode(ctx, id));
  runJson.finished_at = new Date().toISOString();
  writeJson(join(ctx.runDir, 'run.json'), runJson);
  return { runId, runDir: ctx.runDir, results };
}
