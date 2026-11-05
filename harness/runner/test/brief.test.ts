import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Track } from '../../../lib/contracts.ts';
import { REPO_ROOT } from '../../../lib/io.ts';
import { check } from '../../../lib/schemas.ts';
import { generateTrack, loadApps } from '../../generator/src/index.ts';
import { buildBrief } from '../src/index.ts';

const FX = join(REPO_ROOT, 'harness', 'generator', 'test', 'fixtures');
const APPS = join(FX, 'apps');

function fixture(brief: Track['brief']) {
  const r = generateTrack(join(FX, 'tracks', 'mix.yaml'), { appsRoot: APPS, write: false });
  const episode = r.episodes.find((g) => g.episode.app === 'alpha')!.episode;
  const app = loadApps(APPS).get('alpha')!.config;
  const track: Track = { ...r.track, brief };
  return buildBrief({ episode, app, track, targets: [{ name: 'web', url: 'http://web:8080/home' }], categories: ['functional', 'copy'] });
}

describe('buildBrief', () => {
  it('regression briefs carry mode, purpose, journeys and pages', () => {
    const b = fixture({ journeys: true, wall_time_s: 120, goal: 'Check the list' });
    expect(check('brief', b)).toEqual([]);
    expect(b.mode).toBe('regression');
    expect(b.purpose).toBe('A list of things: viewers read it, editors change it.');
    expect(b.journeys?.map((j) => j.id)).toEqual(['alpha.list']);
    expect(b.pages).toEqual(['/home', '/about']);
    expect(b.goal).toBe('Check the list');
  });

  it('a track without brief.mode is regression', () => {
    expect(fixture({ journeys: true }).mode).toBe('regression');
  });

  it('exploratory briefs carry purpose, targets, roles, budget and categories, but no journeys, pages or goal', () => {
    const b = fixture({ mode: 'exploratory', journeys: true, wall_time_s: 300, money_usd: 2 });
    expect(check('brief', b)).toEqual([]);
    expect(b.mode).toBe('exploratory');
    expect(b.purpose).toBe('A list of things: viewers read it, editors change it.');
    expect(b.targets).toEqual([{ name: 'web', url: 'http://web:8080/home' }]);
    expect(b.roles.map((r) => r.role)).toEqual(['viewer', 'editor']);
    expect(b.roles.find((r) => r.role === 'editor')?.accounts.length).toBe(2);
    expect(b.budget).toEqual({ wall_time_s: 300, money_usd: 2 });
    expect(b.categories).toEqual(['functional', 'copy']);
    expect(b.journeys).toBeUndefined();
    expect(b.pages).toBeUndefined();
    expect(b.goal).toBeUndefined();
    // No journey text anywhere, even though the app has journeys and the track says journeys: true.
    const text = JSON.stringify(b);
    for (const s of ['alpha.list', 'List things', 'Open the list', 'Check the total', '/about']) expect(text).not.toContain(s);
  });

  it('exploratory briefs keep a goal the track sets', () => {
    expect(fixture({ mode: 'exploratory', goal: 'Find what is broken before release' }).goal).toBe('Find what is broken before release');
  });

  it('the repo exploration track briefs exploratory with the app purpose', () => {
    const r = generateTrack(join(REPO_ROOT, 'tracks', 'exploration.yaml'), { write: false });
    const apps = loadApps();
    for (const g of r.episodes.slice(0, 4)) {
      const app = apps.get(g.episode.app)!.config;
      const b = buildBrief({ episode: g.episode, app, track: r.track, targets: [{ name: 't', url: 'http://t:80/' }] });
      expect(check('brief', b)).toEqual([]);
      expect(b.mode).toBe('exploratory');
      expect(b.purpose).toBe(app.purpose);
      expect(b.journeys).toBeUndefined();
      expect(b.pages).toBeUndefined();
    }
  });
});
