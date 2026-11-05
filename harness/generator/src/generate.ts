// Episode generator (BRIEF §6.3): tracks/<track>.yaml + apps/ -> episodes/<track>/<id>/{episode.json,answer-key.json}.
// Deterministic: everything random comes from a PRNG seeded by the track's episodes.seed, every list is sorted
// before it is consumed, and nothing time-dependent is written.
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import {
  BENCH_VERSION,
  type Account,
  type AnswerKey,
  type Episode,
  type Label,
  type Range,
  type Split,
  type Track,
  type TrackApp,
} from '../../../lib/contracts.ts';
import { REPO_ROOT, jsonText, readData, sha256, writeJson } from '../../../lib/io.ts';
import { assertValid } from '../../../lib/schemas.ts';
import { DEFAULT_APPS_ROOT, loadApp, type LoadedApp } from './apps.ts';
import { Rng, deriveSeed } from './prng.ts';

export const DEFAULT_EPISODES_ROOT = join(REPO_ROOT, 'episodes');
export const DEFAULT_TRACKS_ROOT = join(REPO_ROOT, 'tracks');

export interface GenerateOptions {
  /** Folder holding <app>/app.yaml etc. Default: the repo's apps/. */
  appsRoot?: string;
  /** Where public episodes go. Default: the repo's episodes/. */
  episodesRoot?: string;
  /** Where held-out episodes go. Default: env QA_BENCH_HELDOUT_DIR. Never inside the repo. */
  heldoutRoot?: string;
  /** Also generate episodes for the track's live sites. */
  live?: boolean;
  /** How many held-out episodes (default: the track's count). */
  heldoutCount?: number;
  benchVersion?: string;
  /** Write files (default true). With false, only returns what would be written. */
  write?: boolean;
  /**
   * Restrict the track to these apps (others listed in the track are ignored, with a warning). For local
   * work while an app isn't in the repo yet; published episode sets use the whole track.
   */
  onlyApps?: string[];
}

/** App id of live-site episodes. A live site has no app folder, labels or compose file. */
export const LIVE_APP = 'live';

export interface GeneratedEpisode {
  episode: Episode;
  answerKey: AnswerKey;
  /** Folder it was (or would be) written to. */
  dir: string;
  episodeText: string;
  answerKeyText: string;
}

export interface GenerateResult {
  track: Track;
  episodes: GeneratedEpisode[];
  heldout: GeneratedEpisode[];
  warnings: string[];
}

interface Pool {
  app: LoadedApp;
  weight: number;
  mutations: Label[];
  changes: Label[];
  baseline: Label[];
  /** Every env key any pool label can switch, blanked when not active so a stray host value can't leak in. */
  switchKeys: string[];
}

type Kind = 'clean' | 'twin' | 'mixed';

interface Planned {
  kind: Kind;
  pool: Pool;
  mutations: Label[];
  changes: Label[];
}

const byId = (a: Label, b: Label): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function resolveList(spec: TrackApp['mutations'], all: Label[], kind: 'defect' | 'change', app: LoadedApp, where: string): Label[] {
  if (spec === undefined || spec === '*') return all;
  const out: Label[] = [];
  for (const id of spec) {
    const l = all.find((x) => x.id === id);
    if (!l) throw new Error(`${where}: '${id}' is not a ${kind} of ${app.id}`);
    out.push(l);
  }
  return out.sort(byId);
}

function buildPools(track: Track, apps: Map<string, LoadedApp>, split: Split, where: string): Pool[] {
  const pools: Pool[] = [];
  for (const ta of track.apps) {
    const app = apps.get(ta.app);
    if (!app) throw new Error(`${where}: unknown app '${ta.app}'`);
    const inSplit = (l: Label): boolean => (split === 'public' ? l.split === 'public' : l.split === 'heldout');
    const mutations = resolveList(ta.mutations, app.mutations, 'defect', app, where).filter(inSplit);
    const changes = resolveList(ta.changes, app.changes, 'change', app, where).filter(inSplit);
    // Public answer keys carry public baselines only, so they never hint at held-out material.
    const baseline = app.baseline.filter((l) => split === 'heldout' || l.split === 'public');
    const keys = new Set<string>();
    for (const l of [...mutations, ...changes]) for (const k of Object.keys(l.switch?.env ?? {})) keys.add(k);
    pools.push({ app, weight: ta.weight ?? 1, mutations, changes, baseline, switchKeys: [...keys].sort() });
  }
  return pools;
}

/** Lower bound on episodes needed to switch on every label in `labels` once, given a per-episode cap. */
function episodesNeeded(labels: Label[], cap: number): number {
  if (!labels.length) return 0;
  const groups = new Map<string, number>();
  for (const l of labels) {
    const g = l.switch?.exclusive;
    if (g) groups.set(g, (groups.get(g) ?? 0) + 1);
  }
  return Math.max(Math.ceil(labels.length / Math.max(cap, 1)), ...groups.values());
}

class Planner {
  private readonly uses = new Map<string, number>();
  private readonly appUses = new Map<string, number>();

  constructor(private readonly rng: Rng, private readonly pools: Pool[], private readonly track: Track) {}

  private used(l: Label): number {
    return this.uses.get(l.id) ?? 0;
  }

  private uncovered(labels: Label[]): Label[] {
    return labels.filter((l) => this.used(l) === 0);
  }

  /** Labels ordered least-used first, ties broken by the PRNG. */
  private order(labels: Label[]): Label[] {
    const shuffled = this.rng.shuffle(labels);
    return shuffled
      .map((l, i) => ({ l, i }))
      .sort((a, b) => this.used(a.l) - this.used(b.l) || a.i - b.i)
      .map((x) => x.l);
  }

  private pick(labels: Label[], k: number, groups: Set<string>): Label[] {
    const out: Label[] = [];
    for (const l of this.order(labels)) {
      if (out.length >= k) break;
      const g = l.switch?.exclusive;
      if (g && groups.has(g)) continue;
      if (g) groups.add(g);
      out.push(l);
    }
    for (const l of out) this.uses.set(l.id, this.used(l) + 1);
    return out.sort(byId);
  }

  /** Weighted pick, preferring pools that have not yet had an episode of this kind. */
  private weightedFresh(candidates: Pool[], kind: Kind): Pool {
    const fresh = candidates.filter((p) => !this.appUses.has(`${kind}:${p.app.id}`));
    return this.rng.weighted(fresh.length ? fresh : candidates, (p) => p.weight);
  }

  private markApp(p: Pool, kind: Kind): void {
    this.appUses.set(`${kind}:${p.app.id}`, (this.appUses.get(`${kind}:${p.app.id}`) ?? 0) + 1);
  }

  plan(kinds: Kind[]): Planned[] {
    const mr: Range = this.track.episodes.mutations_per_episode ?? { min: 1, max: 1 };
    const cr: Range = this.track.episodes.changes_per_episode ?? { min: 0, max: 0 };
    let mixedLeft = kinds.filter((k) => k === 'mixed').length;
    const out: Planned[] = [];

    for (const kind of kinds) {
      const groups = new Set<string>();
      if (kind === 'clean') {
        const pool = this.weightedFresh(this.pools, kind);
        this.markApp(pool, kind);
        out.push({ kind, pool, mutations: [], changes: [] });
        continue;
      }
      if (kind === 'twin') {
        const withChanges = this.pools.filter((p) => p.changes.length);
        const needy = withChanges.filter((p) => this.uncovered(p.changes).length);
        const pool = needy.length ? this.rng.weighted(needy, (p) => p.weight) : this.weightedFresh(withChanges, kind);
        this.markApp(pool, kind);
        const c = Math.max(1, this.rng.int(cr.min, Math.max(cr.min, cr.max)));
        out.push({ kind, pool, mutations: [], changes: this.pick(pool.changes, c, groups) });
        continue;
      }

      // mixed
      const withMutations = this.pools.filter((p) => p.mutations.length);
      const candidates = withMutations.length ? withMutations : this.pools;
      const needs = new Map(candidates.map((p) => [p, episodesNeeded(this.uncovered(p.mutations), mr.max)]));
      const needy = candidates.filter((p) => (needs.get(p) ?? 0) > 0);
      const totalNeed = needy.reduce((s, p) => s + (needs.get(p) ?? 0), 0);
      let pool: Pool;
      if (needy.length && totalNeed >= mixedLeft) {
        // Tight: serve the app that needs the most episodes to cover its mutations (ties: weight, then id).
        pool = needy.slice().sort((a, b) => (needs.get(b) ?? 0) - (needs.get(a) ?? 0) || b.weight - a.weight || (a.app.id < b.app.id ? -1 : 1))[0] as Pool;
      } else if (needy.length) {
        pool = this.rng.weighted(needy, (p) => p.weight);
      } else {
        pool = this.rng.weighted(candidates, (p) => p.weight);
      }
      this.markApp(pool, kind);

      let k = this.rng.int(mr.min, Math.max(mr.min, mr.max));
      const unc = this.uncovered(pool.mutations).length;
      if (unc) {
        // Still covering: push towards the cap when the remaining episodes are tight, but never repeat a
        // covered mutation beyond the minimum while others are uncovered.
        if (totalNeed >= mixedLeft) k = mr.max;
        k = Math.max(mr.min, Math.min(k, unc));
      }
      const mutations = this.pick(pool.mutations, k, groups);
      const c = this.rng.int(cr.min, Math.max(cr.min, cr.max));
      const changes = this.pick(pool.changes, c, groups);
      out.push({ kind, pool, mutations, changes });
      mixedLeft--;
    }
    return out;
  }
}

function kindsFor(track: Track, count: number, pools: Pool[], rng: Rng, warnings: string[], where: string): Kind[] {
  const clean = Math.min(track.episodes.clean_episodes ?? 0, count);
  let twin = Math.min(track.episodes.twin_episodes ?? 0, count - clean);
  if (twin && !pools.some((p) => p.changes.length)) {
    warnings.push(`${where}: ${twin} twin episode(s) requested but no app has a deliberate change; generated as clean`);
    twin = 0;
  }
  const kinds: Kind[] = [];
  for (let i = 0; i < count; i++) kinds.push(i < clean ? 'clean' : i < clean + twin ? 'twin' : 'mixed');
  if (clean + twin < count && !pools.some((p) => p.mutations.length)) {
    // Nothing to plant (e.g. a noise-only track): mixed episodes come out clean.
    return rng.shuffle(kinds.map((k) => (k === 'mixed' ? 'clean' : k)));
  }
  return rng.shuffle(kinds);
}

function generateAccounts(app: LoadedApp, rng: Rng): Account[] {
  const out: Account[] = [];
  const taken = new Set<string>();
  for (const role of app.config.roles) {
    if (role.fixed?.length) {
      const fixed = role.accounts > 0 ? role.fixed.slice(0, role.accounts) : role.fixed;
      for (const f of fixed) out.push({ role: role.role, username: f.username, password: f.password });
      continue;
    }
    const prefix = role.username_prefix ?? role.role;
    for (let i = 0; i < role.accounts; i++) {
      let username = `${prefix}-${rng.hex(4)}`;
      while (taken.has(username)) username = `${prefix}-${rng.hex(4)}`;
      taken.add(username);
      out.push({ role: role.role, username, password: rng.token(16) });
    }
  }
  return out;
}

/** Compose env: blanked switch keys, then seed_env, then active switches (joined by label id), then accounts. */
export function mergeEnv(pool: Pick<Pool, 'app' | 'switchKeys'>, active: Label[], accounts: Account[]): Record<string, string> {
  const env: Record<string, string> = {};
  for (const k of pool.switchKeys) env[k] = '';
  Object.assign(env, pool.app.config.seed_env ?? {});
  const values = new Map<string, string[]>();
  for (const l of active.slice().sort(byId)) {
    for (const [k, v] of Object.entries(l.switch?.env ?? {})) values.set(k, [...(values.get(k) ?? []), v]);
  }
  for (const [k, vs] of values) env[k] = vs.join(',');
  for (const role of pool.app.config.roles) {
    if (!role.env) continue;
    env[role.env] = accounts.filter((a) => a.role === role.role).map((a) => `${a.username}:${a.password}`).join(',');
  }
  return Object.fromEntries(Object.keys(env).sort().map((k) => [k, env[k] as string]));
}

function upstreamPin(app: LoadedApp): Record<string, unknown> | undefined {
  const up = app.upstream;
  if (!up) return undefined;
  return { repo: up.repo, use: up.use, pin: up.pin };
}

function build(
  track: Track, id: string, split: Split, seed: number, plan: Planned, benchVersion: string, dir: string,
): GeneratedEpisode {
  const { pool } = plan;
  const rng = new Rng(seed);
  const accounts = generateAccounts(pool.app, rng);
  const active = [...plan.mutations, ...plan.changes];
  const answerKey: AnswerKey = {
    episode_id: id,
    app: pool.app.id,
    track: track.id,
    noise_only: pool.app.config.noise_only ?? false,
    labels: [...plan.mutations, ...plan.changes, ...pool.baseline],
  };
  assertValid('answer-key', answerKey, `${id}/answer-key.json`);
  const answerKeyText = jsonText(answerKey);
  const kind: Kind = plan.mutations.length ? 'mixed' : plan.changes.length ? 'twin' : 'clean';
  const episode: Episode = {
    id,
    bench_version: benchVersion,
    track: track.id,
    app: pool.app.id,
    split,
    seed,
    kind,
    active: { mutations: plan.mutations.map((l) => l.id), changes: plan.changes.map((l) => l.id) },
    env: mergeEnv(pool, active, accounts),
    accounts,
    ...(upstreamPin(pool.app) ? { upstream: upstreamPin(pool.app) } : {}),
    answer_key_sha256: sha256(answerKeyText),
  };
  assertValid('episode', episode, `${id}/episode.json`);
  return { episode, answerKey, dir: join(dir, id), episodeText: jsonText(episode), answerKeyText };
}

function buildLive(track: Track, index: number, benchVersion: string, dir: string): GeneratedEpisode {
  const live = track.live?.[index];
  if (!live) throw new Error(`live entry ${index} missing`);
  const id = `${track.id}-live-${String(index + 1).padStart(2, '0')}`;
  // A live site is the pseudo-app 'live' (no folder under apps/): nothing is planted and nothing is excused, so
  // every finding is a false alarm. The site itself is named by episode.live.
  const answerKey: AnswerKey = { episode_id: id, app: LIVE_APP, track: track.id, noise_only: true, labels: [] };
  assertValid('answer-key', answerKey, `${id}/answer-key.json`);
  const answerKeyText = jsonText(answerKey);
  const episode: Episode = {
    id,
    bench_version: benchVersion,
    track: track.id,
    app: LIVE_APP,
    split: 'public',
    seed: deriveSeed(track.episodes.seed, `live:${index}`),
    kind: 'clean',
    active: { mutations: [], changes: [] },
    env: {},
    accounts: [],
    live: { name: live.name, url: live.url, ...(live.pages ? { pages: live.pages } : {}), rules: live.rules },
    answer_key_sha256: sha256(answerKeyText),
  };
  assertValid('episode', episode, `${id}/episode.json`);
  return { episode, answerKey, dir: join(dir, id), episodeText: jsonText(episode), answerKeyText };
}

function inside(child: string, parent: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function writeAll(root: string, trackId: string, episodes: GeneratedEpisode[]): void {
  const dir = join(root, trackId);
  rmSync(dir, { recursive: true, force: true }); // stale episodes of this track
  mkdirSync(dir, { recursive: true });
  for (const g of episodes) {
    const keyText = writeJson(join(g.dir, 'answer-key.json'), g.answerKey);
    if (sha256(keyText) !== g.episode.answer_key_sha256) throw new Error(`${g.episode.id}: answer key changed while writing`);
    writeJson(join(g.dir, 'episode.json'), g.episode);
  }
}

export function loadTrack(trackFile: string): Track {
  return assertValid<Track>('track', readData(trackFile), trackFile);
}

/** Generate (and by default write) every episode of one track. */
export function generateTrack(trackFile: string, opts: GenerateOptions = {}): GenerateResult {
  const track = loadTrack(trackFile);
  const appsRoot = opts.appsRoot ?? DEFAULT_APPS_ROOT;
  const episodesRoot = opts.episodesRoot ?? DEFAULT_EPISODES_ROOT;
  const heldoutRoot = opts.heldoutRoot ?? process.env.QA_BENCH_HELDOUT_DIR;
  const benchVersion = opts.benchVersion ?? BENCH_VERSION;
  const warnings: string[] = [];

  if (opts.onlyApps) {
    const only = new Set(opts.onlyApps);
    const kept = track.apps.filter((ta) => only.has(ta.app));
    const dropped = track.apps.filter((ta) => !only.has(ta.app)).map((ta) => ta.app);
    if (!kept.length) throw new Error(`${trackFile}: none of ${opts.onlyApps.join(', ')} is in track '${track.id}'`);
    if (dropped.length) warnings.push(`${track.id}: restricted to ${kept.map((t) => t.app).join(', ')}; ignored ${dropped.join(', ')}`);
    track.apps = kept;
  }
  const apps = new Map<string, LoadedApp>();
  for (const ta of track.apps) {
    const dir = join(appsRoot, ta.app);
    if (!existsSync(join(dir, 'app.yaml')) && !existsSync(join(dir, 'app.yml'))) {
      throw new Error(`${trackFile}: unknown app '${ta.app}' (no ${join(dir, 'app.yaml')})`);
    }
    apps.set(ta.app, loadApp(dir, ta.app));
  }

  // Public split.
  const pools = buildPools(track, apps, 'public', trackFile);
  const planRng = new Rng(deriveSeed(track.episodes.seed, 'plan'));
  const kinds = kindsFor(track, track.episodes.count, pools, planRng, warnings, trackFile);
  const plans = new Planner(planRng, pools, track).plan(kinds);
  const pubDir = join(episodesRoot, track.id);
  const episodes = plans.map((p, i) =>
    build(track, `${track.id}-${String(i + 1).padStart(3, '0')}`, 'public', deriveSeed(track.episodes.seed, i), p, benchVersion, pubDir),
  );
  if (opts.live) track.live?.forEach((_, i) => episodes.push(buildLive(track, i, benchVersion, pubDir)));

  // Coverage report.
  const on = new Set(plans.flatMap((x) => [...x.mutations, ...x.changes]).map((l) => l.id));
  for (const p of pools) {
    const missed = [...p.mutations, ...p.changes].filter((l) => !on.has(l.id)).map((l) => l.id);
    if (missed.length) warnings.push(`${track.id}: not covered with count ${track.episodes.count}: ${missed.join(', ')}`);
  }

  // Held-out split: only apps that have held-out labels in this track, and only into a root outside the repo.
  const heldoutPools = buildPools(track, apps, 'heldout', trackFile).filter((p) => p.mutations.length || p.changes.length);
  let heldout: GeneratedEpisode[] = [];
  if (heldoutPools.length) {
    const n = heldoutPools.reduce((s, p) => s + p.mutations.length + p.changes.length, 0);
    if (!heldoutRoot) {
      warnings.push(`${track.id}: ${n} held-out label(s) not generated (no --heldout-root / QA_BENCH_HELDOUT_DIR)`);
    } else {
      if (inside(heldoutRoot, REPO_ROOT) || inside(heldoutRoot, episodesRoot)) {
        throw new Error(`held-out root ${heldoutRoot} is inside the repo or the public episodes root; refusing`);
      }
      const hRng = new Rng(deriveSeed(track.episodes.seed, 'heldout-plan'));
      const count = opts.heldoutCount ?? track.episodes.count;
      const hKinds = kindsFor(track, count, heldoutPools, hRng, warnings, `${trackFile} (held-out)`);
      const hPlans = new Planner(hRng, heldoutPools, track).plan(hKinds);
      const hDir = join(heldoutRoot, track.id);
      heldout = hPlans.map((p, i) =>
        build(track, `${track.id}-h${String(i + 1).padStart(3, '0')}`, 'heldout', deriveSeed(track.episodes.seed, `heldout:${i}`), p, benchVersion, hDir),
      );
    }
  }

  if (opts.write !== false) {
    writeAll(episodesRoot, track.id, episodes);
    if (heldoutRoot && heldout.length) writeAll(heldoutRoot, track.id, heldout);
  }
  return { track, episodes, heldout, warnings };
}

/** Every tracks/*.yaml under tracksRoot, sorted. */
export function listTrackFiles(tracksRoot: string = DEFAULT_TRACKS_ROOT): string[] {
  if (!existsSync(tracksRoot)) return [];
  return readdirSync(tracksRoot)
    .filter((f) => /\.ya?ml$/.test(f))
    .sort()
    .map((f) => join(tracksRoot, f));
}
