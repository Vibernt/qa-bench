import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { generateTrack, loadApps } from '../src/index.ts';
import { REPO_ROOT } from '../../../lib/io.ts';
import { validateRepo, schemaFor } from '../../../scripts/validate.ts';
import { check } from '../../../lib/schemas.ts';

const generate = (track: string) => generateTrack(join(REPO_ROOT, 'tracks', `${track}.yaml`), { write: false });
describe('trap generation and contracts', () => {
  it('validates trap paths and the repository without generating checked-in episodes', () => {
    expect(schemaFor('apps/expense-app/traps/refund-row/label.yaml')).toBe('label');
    expect(validateRepo().problems).toEqual([]);
    const trap = loadApps().get('expense-app')!.traps[0]!;
    expect(check('label', trap)).toEqual([]);
    const { switch: _switch, ...unswitched } = trap;
    expect(check('label', unswitched).length).toBeGreaterThan(0);
  });
  it.each(['exploration', 'regression'])('%s: new defects mask natural symptoms only when active, without changing old natural metadata', track => {
    const episodes = generate(track).episodes;
    for (const [defect, natural] of [['raw-error', 'huge-amount-breaks-list'], ['blank-title-accepted', 'rejected-form-loses-input']]) {
      const active = episodes.filter(g => g.episode.active.mutations.includes(`expense.${defect}`));
      expect(active.length).toBeGreaterThan(0);
      for (const g of active) expect(g.answerKey.labels.some(l => l.id === `expense.${natural}`)).toBe(false);
      const clean = episodes.find(g => g.episode.app === 'expense-app' && g.episode.kind === 'clean')!;
      const label = clean.answerKey.labels.find(l => l.id === `expense.${natural}`)!;
      expect(label).toBeDefined();
      expect(label).not.toHaveProperty('masked_by');
    }
  });
  it('the twelve-episode set has every new defect and two trap-only controls, every trap at least twice', () => {
    const generated = generate('exploration');
    const set = YAML.parse(readFileSync(join(REPO_ROOT, 'harness/agents/sets/v0.4-kinds-12.yaml'), 'utf8')) as { episodes: string[] };
    expect(set.episodes).toHaveLength(12);
    const chosen = set.episodes.map(id => generated.episodes.find(g => g.episode.id === id)!);
    expect(chosen.every(Boolean)).toBe(true);
    expect(chosen.filter(g => g.episode.kind === 'clean' && g.episode.active.traps?.length)).toHaveLength(2);
    const app = loadApps().get('expense-app')!;
    for (const trap of app.traps) expect(chosen.filter(g => g.episode.active.traps?.includes(trap.id)).length, trap.id).toBeGreaterThanOrEqual(2);
    const newNames = ['template-token','misspelled-label','sign-out-dead','wrong-row-action','add-link-404','negative-amount-accepted','password-visible','raw-error','blank-title-accepted','non-ascii-mangled'];
    for (const name of newNames) expect(chosen.some(g => g.episode.active.mutations.includes(`expense.${name}`)), name).toBe(true);
  });
  for (const track of ['exploration','regression']) it(`${track} joins TRAP switches, seals labels, and carries paired traps and controls`, () => {
    const a = generate(track), b = generate(track);
    expect(a.episodes.map(g => g.episodeText)).toEqual(b.episodes.map(g => g.episodeText));
    expect(a.warnings.filter(w => w.includes('not covered'))).toEqual([]);
    for (const g of a.episodes.filter(g => g.episode.app === 'expense-app')) {
      const traps = g.answerKey.labels.filter(l => l.kind === 'trap');
      expect(traps.map(l => l.id).sort()).toEqual([...(g.episode.active.traps ?? [])].sort());
      expect(g.episode.env.TRAP).toBe(traps.length ? traps.sort((a,b) => a.id.localeCompare(b.id)).map(l => l.switch!.env!.TRAP).join(',') : undefined);
      expect(check('episode', g.episode)).toEqual([]);
      expect(check('answer-key', g.answerKey)).toEqual([]);
    }
    for (const [defect, trap] of [['template-token','braces-title'], ['negative-amount-accepted','refund-row']]) {
      expect(a.episodes.some(g => g.episode.active.mutations.includes(`expense.${defect}`) && g.episode.active.traps?.includes(`expense.${trap}`))).toBe(true);
    }
    const originalCount = a.track.episodes.count - a.track.episodes.recipes!.length;
    for (const g of a.episodes.slice(0, originalCount)) {
      expect(g.episode.active).not.toHaveProperty('traps');
      expect(g.episode.env).not.toHaveProperty('TRAP');
      expect(g.episode.active.mutations.every(id => !a.track.apps.find(p => p.app === g.episode.app)?.recipes_only?.mutations?.includes(id))).toBe(true);
    }
  });
});
