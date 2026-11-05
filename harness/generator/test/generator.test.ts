import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { AnswerKey, Episode, Label } from '../../../lib/contracts.ts';
import { REPO_ROOT, sha256 } from '../../../lib/io.ts';
import { check } from '../../../lib/schemas.ts';
import { LIVE_APP, Rng, deriveSeed, generateTrack, loadApps, mergeEnv, mulberry32 } from '../src/index.ts';

const FX = join(import.meta.dirname, 'fixtures');
const APPS = join(FX, 'apps');
const MIX = join(FX, 'tracks', 'mix.yaml');
const QUIET = join(FX, 'tracks', 'quiet.yaml');

const temps: string[] = [];
function temp(): string {
  const d = mkdtempSync(join(tmpdir(), 'qab-gen-'));
  temps.push(d);
  return d;
}
afterEach(() => {
  for (const d of temps.splice(0)) rmSync(d, { recursive: true, force: true });
});

function readTree(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string, rel: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      if (statSync(full).isDirectory()) walk(full, r);
      else out[r] = readFileSync(full, 'utf8');
    }
  };
  walk(root, '');
  return out;
}

const labelsOf = (apps: ReturnType<typeof loadApps>): Map<string, Label> => {
  const m = new Map<string, Label>();
  for (const a of apps.values()) for (const l of [...a.mutations, ...a.changes, ...a.baseline]) m.set(l.id, l);
  return m;
};

describe('prng', () => {
  it('is deterministic and seed-sensitive', () => {
    const a = mulberry32(1);
    const b = mulberry32(1);
    const c = mulberry32(2);
    const sa = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(sa);
    expect(Array.from({ length: 5 }, c)).not.toEqual(sa);
    for (const x of sa) expect(x >= 0 && x < 1).toBe(true);
  });
  it('pins the sequence, so output never drifts across machines', () => {
    expect(new Rng(42).hex(8)).toBe(new Rng(42).hex(8));
    expect(deriveSeed(20261105, 0)).toBe(deriveSeed(20261105, 0));
    expect(deriveSeed(20261105, 0)).not.toBe(deriveSeed(20261105, 1));
    expect(Number.isInteger(deriveSeed(1, 'x')) && deriveSeed(1, 'x') >= 0).toBe(true);
    // Golden values: change these only with a bench version bump.
    expect(mulberry32(1)()).toBeCloseTo(0.6270739405881613, 12);
    expect(deriveSeed(7, 0)).toBe(deriveSeed(7, '0'));
  });
  it('shuffles without losing items and picks by weight', () => {
    const r = new Rng(3);
    expect(r.shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 2000; i++) counts[r.weighted(['a', 'b'] as const, (x) => (x === 'a' ? 3 : 1))]++;
    expect(counts.a).toBeGreaterThan(counts.b * 2);
  });
});

describe('generateTrack', () => {
  it('writes byte-identical output for the same inputs', () => {
    const a = temp();
    const b = temp();
    generateTrack(MIX, { appsRoot: APPS, episodesRoot: a });
    generateTrack(MIX, { appsRoot: APPS, episodesRoot: b });
    const ta = readTree(a);
    expect(Object.keys(ta).length).toBe(24);
    expect(readTree(b)).toEqual(ta);
    for (const text of Object.values(ta)) expect(text).not.toMatch(/20\d\d-\d\d-\d\dT/); // no timestamps
  });

  it('validates, and seals each answer key by its sha256 as written', () => {
    const root = temp();
    const r = generateTrack(MIX, { appsRoot: APPS, episodesRoot: root });
    for (const g of r.episodes) {
      const dir = join(root, 'mix', g.episode.id);
      const ep = JSON.parse(readFileSync(join(dir, 'episode.json'), 'utf8')) as Episode;
      expect(check('episode', ep)).toEqual([]);
      const keyBytes = readFileSync(join(dir, 'answer-key.json'));
      expect(check('answer-key', JSON.parse(keyBytes.toString('utf8')))).toEqual([]);
      expect(sha256(keyBytes)).toBe(ep.answer_key_sha256);
      expect(ep.seed).toBe(deriveSeed(20261104, r.episodes.indexOf(g)));
    }
  });

  it('makes clean and twin episodes as asked, and covers every label before repeating', () => {
    const r = generateTrack(MIX, { appsRoot: APPS, write: false });
    const eps = r.episodes.map((g) => g.episode);
    expect(eps.length).toBe(12);
    const clean = eps.filter((e) => e.kind === 'clean');
    const twin = eps.filter((e) => e.kind === 'twin');
    expect(clean.length).toBe(2);
    for (const e of clean) expect([...e.active.mutations, ...e.active.changes]).toEqual([]);
    expect(twin.length).toBe(2);
    for (const e of twin) {
      expect(e.active.mutations).toEqual([]);
      expect(e.active.changes.length).toBeGreaterThan(0);
      expect(e.app).toBe('alpha'); // the only app with changes
    }
    for (const e of eps.filter((x) => x.kind === 'mixed')) expect(e.active.mutations.length).toBeGreaterThan(0);

    const on = new Set(eps.flatMap((e) => [...e.active.mutations, ...e.active.changes]));
    for (const id of ['alpha.one', 'alpha.two', 'alpha.three', 'alpha.four', 'alpha.banner', 'alpha.rename', 'beta.broken', 'beta.slow']) {
      expect(on.has(id)).toBe(true);
    }
    // Before every public mutation has been on once, none is on twice.
    const seen = new Map<string, number>();
    const total = 6;
    for (const e of eps) {
      if (seen.size === total) break;
      for (const id of e.active.mutations) {
        expect(seen.has(id)).toBe(false);
        seen.set(id, 1);
      }
    }
    expect(r.warnings.filter((w) => w.includes('not covered'))).toEqual([]);
  });

  it('never switches on two labels of one exclusive group', () => {
    const labels = labelsOf(loadApps(APPS));
    for (const seed of [1, 2, 3, 99, 20261105]) {
      const root = temp();
      const trackFile = join(root, 'mix.yaml');
      writeFileSync(trackFile, readFileSync(MIX, 'utf8').replace(/seed: \d+/, `seed: ${seed}`).replace('max: 2', 'max: 4'));
      const r = generateTrack(trackFile, { appsRoot: APPS, write: false });
      for (const { episode: e } of r.episodes) {
        const groups = [...e.active.mutations, ...e.active.changes].map((id) => labels.get(id)?.switch?.exclusive).filter(Boolean);
        expect(new Set(groups).size).toBe(groups.length);
      }
    }
  });

  it('merges env: seed_env, switches joined in label-id order, generated accounts', () => {
    const r = generateTrack(MIX, { appsRoot: APPS, write: false });
    const both = r.episodes.find((g) => g.episode.active.mutations.join() === 'beta.broken,beta.slow');
    expect(both?.episode.env.BETA_USER).toBe('zq_beta_broken,zq_beta_slow');
    const alpha = r.episodes.find((g) => g.episode.app === 'alpha')!.episode;
    expect(alpha.env.ALPHA_SEED).toBe('42');
    const editors = alpha.accounts.filter((a) => a.role === 'editor');
    expect(editors.length).toBe(2);
    expect(alpha.env.ALPHA_EDITORS).toBe(editors.map((a) => `${a.username}:${a.password}`).join(','));
    for (const a of alpha.accounts) {
      expect(a.username).toMatch(/^(viewer|editor)-[0-9a-f]{4}$/);
      expect(a.password).toMatch(/^[A-Za-z0-9]{16}$/);
    }
    const beta = r.episodes.find((g) => g.episode.app === 'beta')!.episode;
    expect(beta.accounts).toEqual([{ role: 'customer', username: 'shopper', password: 'test_only_pw' }]);
    // A switch key no active label sets is blanked, so a stray host value cannot switch it on.
    const app = loadApps(APPS).get('alpha')!;
    const env = mergeEnv({ app, switchKeys: ['ALPHA_DEFECT'] }, [], []);
    expect(env).toEqual({ ALPHA_DEFECT: '', ALPHA_EDITORS: '', ALPHA_MODE: 'plain', ALPHA_SEED: '42', ALPHA_VIEWERS: '' });
    expect(Object.keys(env)).toEqual(Object.keys(env).slice().sort());
  });

  it('puts all active labels and every baseline and natural label in the answer key', () => {
    const r = generateTrack(MIX, { appsRoot: APPS, write: false });
    for (const g of r.episodes) {
      const ids = g.answerKey.labels.map((l) => l.id);
      expect(ids).toEqual(expect.arrayContaining([...g.episode.active.mutations, ...g.episode.active.changes]));
      if (g.episode.app === 'alpha') expect(ids).toEqual(expect.arrayContaining(['alpha.quirk', 'alpha.real-bug']));
      expect(g.answerKey.labels.every((l) => typeof l.found_by === 'object')).toBe(true); // full objects
    }
    expect(r.episodes[0]!.episode.upstream ?? {}).toBeTypeOf('object');
    const alpha = r.episodes.find((g) => g.episode.app === 'alpha')!.episode;
    expect(alpha.upstream).toEqual({ repo: 'https://example.invalid/alpha', use: 'mutate', pin: { commit: '0123456789abcdef0123456789abcdef01234567' } });
  });

  it('keeps held-out labels out of public episodes and writes them only to the held-out root', () => {
    const pub = temp();
    const held = temp();
    const r = generateTrack(MIX, { appsRoot: APPS, episodesRoot: pub, heldoutRoot: held });
    const pubText = Object.values(readTree(pub)).join('\n');
    expect(pubText).not.toContain('alpha.secret');
    expect(pubText).not.toContain('zq_hidden_secret');
    expect(pubText).not.toContain('ALPHA_HIDDEN');
    expect(r.heldout.length).toBeGreaterThan(0);
    const heldText = Object.values(readTree(held)).join('\n');
    expect(heldText).toContain('alpha.secret');
    for (const g of r.heldout) {
      expect(g.episode.split).toBe('heldout');
      expect(g.episode.active.mutations.every((id) => id === 'alpha.secret')).toBe(true);
      expect(g.dir.startsWith(held)).toBe(true);
    }
    expect(() => generateTrack(MIX, { appsRoot: APPS, episodesRoot: pub, heldoutRoot: join(REPO_ROOT, 'episodes-heldout') })).toThrow(/refusing/);
    expect(() => generateTrack(MIX, { appsRoot: APPS, episodesRoot: pub, heldoutRoot: join(pub, 'h') })).toThrow(/refusing/);
  });

  it('deletes stale episodes of the track before writing', () => {
    const root = temp();
    mkdirSync(join(root, 'mix', 'mix-999'), { recursive: true });
    writeFileSync(join(root, 'mix', 'mix-999', 'episode.json'), '{}');
    mkdirSync(join(root, 'other', 'other-001'), { recursive: true });
    generateTrack(MIX, { appsRoot: APPS, episodesRoot: root });
    expect(existsSync(join(root, 'mix', 'mix-999'))).toBe(false);
    expect(existsSync(join(root, 'other', 'other-001'))).toBe(true);
  });

  it('makes noise-only tracks clean and generates live targets only when asked', () => {
    const without = generateTrack(QUIET, { appsRoot: APPS, write: false });
    expect(without.episodes.length).toBe(3);
    for (const g of without.episodes) {
      expect(g.episode.kind).toBe('clean');
      expect(g.answerKey.noise_only).toBe(true);
      expect(g.episode.live).toBeUndefined();
    }
    const withLive = generateTrack(QUIET, { appsRoot: APPS, write: false, live: true });
    const live = withLive.episodes.filter((g) => g.episode.live);
    expect(live.length).toBe(1);
    const e = live[0]!.episode;
    expect(e.id).toBe('quiet-live-01');
    expect(e.app).toBe(LIVE_APP);
    expect(e.live?.rules).toEqual({ methods: ['GET'], forms: false, robots_txt: 'honour', min_interval_ms: 1000 });
    expect((live[0]!.answerKey as AnswerKey).labels).toEqual([]);
  });

  it('restricts a track to some apps when asked, and refuses unknown apps otherwise', () => {
    const r = generateTrack(MIX, { appsRoot: APPS, write: false, onlyApps: ['beta'] });
    expect(new Set(r.episodes.map((g) => g.episode.app))).toEqual(new Set(['beta']));
    const root = temp();
    const trackFile = join(root, 'bad.yaml');
    writeFileSync(trackFile, readFileSync(MIX, 'utf8').replace('id: mix', 'id: bad').replace('app: beta', 'app: nope'));
    expect(() => generateTrack(trackFile, { appsRoot: APPS, write: false })).toThrow(/unknown app 'nope'/);
  });
});

describe('repo tracks', () => {
  it('generates the regression track for the expense app with every defect and the change covered', () => {
    const r = generateTrack(join(REPO_ROOT, 'tracks', 'regression.yaml'), { write: false, onlyApps: ['expense-app'] });
    const eps = r.episodes.map((g) => g.episode);
    expect(eps.length).toBe(17);
    expect(eps.filter((e) => e.kind === 'clean').length).toBe(2);
    expect(eps.filter((e) => e.kind === 'twin').length).toBe(3);
    const apps = loadApps();
    const expense = apps.get('expense-app')!;
    const on = new Set(eps.flatMap((e) => [...e.active.mutations, ...e.active.changes]));
    for (const l of [...expense.mutations, ...expense.changes]) expect(on.has(l.id)).toBe(true);
    for (const e of eps) {
      expect(e.env.QA_BENCH_VIEWER_ACCOUNTS).toMatch(/^viewer-[0-9a-f]{4}:[A-Za-z0-9]{16}$/);
      expect(e.active.mutations.length).toBeLessThanOrEqual(1); // expense-defect is exclusive
    }
  });

  it('plants every repo defect and change at least once across the B0 tracks', () => {
    const apps = loadApps();
    for (const track of ['regression', 'noise']) {
      const r = generateTrack(join(REPO_ROOT, 'tracks', `${track}.yaml`), { write: false });
      const on = new Set(r.episodes.flatMap((g) => [...g.episode.active.mutations, ...g.episode.active.changes]));
      const appIds = new Set(r.episodes.map((g) => g.episode.app));
      for (const id of appIds) {
        const app = apps.get(id)!;
        for (const l of [...app.mutations, ...app.changes]) expect(on.has(l.id), `${track}: ${l.id}`).toBe(true);
      }
    }
  });
});
