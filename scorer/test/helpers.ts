import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AnswerKey, Category, Episode, FindingsFile, Label } from '../../lib/contracts.ts';

export const FIXTURES = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures');
export const loadFindings = (name: string): FindingsFile => JSON.parse(readFileSync(join(FIXTURES, name), 'utf8')) as FindingsFile;

export function label(id: string, over: Partial<Label> = {}): Label {
  return {
    id, app: 'swag', title: id, kind: 'defect', category: 'functional', class: 'deterministic', severity: 'major',
    where: { route: '/inventory.html' }, found_by: [{ kind: 'value' }], split: 'public', ...over,
  };
}

export function finding(id: string, route: string, category: Category = 'functional', extra: Record<string, unknown> = {}) {
  const { role, selector, region, ...rest } = extra as { role?: string; selector?: string; region?: { x: number; y: number; w: number; h: number } };
  return {
    id, category, description: id, confidence: 0.5,
    where: { route, ...(role ? { role } : {}), ...(selector ? { selector } : {}), ...(region ? { region } : {}) }, ...rest,
  };
}

export function episode(id: string, labels: Label[], track = 'regression'): { episode: Episode; answerKey: AnswerKey } {
  return {
    episode: {
      id, bench_version: '0.1.0-b0', track, app: 'swag', split: 'public', seed: 1, active: { mutations: [], changes: [] },
      env: {}, accounts: [], answer_key_sha256: 'x',
    },
    answerKey: { episode_id: id, app: 'swag', track, noise_only: false, labels },
  };
}
