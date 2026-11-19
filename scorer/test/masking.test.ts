import { expect, it } from 'vitest';
import { loadApps } from '../../harness/generator/src/index.ts';
import { aggregate, scoreEpisode } from '../src/index.ts';
import { episode } from './helpers.ts';

it.each(['masks', 'masked_by'] as const)('%s excludes the raw-error masked natural from missed natural recall', field => {
  const app = loadApps().get('expense-app')!;
  const raw = app.mutations.find(l => l.id === 'expense.raw-error')!;
  const natural = app.natural.find(l => l.id === 'expense.huge-amount-breaks-list')!;
  const { masks: _masks, ...withoutMasks } = raw;
  const labels = field === 'masks' ? [raw, natural] : [withoutMasks, { ...natural, masked_by: [raw.id] }];
  const input = episode('raw-error', labels);
  input.episode.active.mutations = [raw.id];
  const score = () => scoreEpisode({ ...input, findings: { episode_id: 'raw-error', system: { name: 'test', version: '1' }, findings: [] }, status: 'scored' });
  const masked = score();
  expect(masked.labels.map(l => l.label_id)).toEqual([raw.id]);
  expect(aggregate([masked]).natural_present).toBe(0);
  expect(aggregate([masked]).natural_recall).toBeNull();
  input.episode.active.mutations = [];
  const clean = score();
  expect(clean.labels.find(l => l.label_id === natural.id)?.hit).toBe(false);
  expect(aggregate([clean]).natural_present).toBe(1);
  expect(aggregate([clean]).natural_recall).toBe(0);
});
