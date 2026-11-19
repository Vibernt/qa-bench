import type { Label, Track } from '../../../lib/contracts.ts';

/** No PRNG calls: adding traps never shifts account generation or the planner's random stream. */
export function selectTraps(labels: Label[], index: number, kind: 'mixed' | 'clean' | 'twin'): Label[] {
  if (!labels.length) return [];
  // Controls exercise all allowed traps; mixed episodes rotate one in addition to explicitly paired recipes.
  return kind === 'mixed' ? [labels[index % labels.length]!] : labels;
}

export function recipeCount(track: Track): number { return track.episodes.recipes?.length ?? 0; }
