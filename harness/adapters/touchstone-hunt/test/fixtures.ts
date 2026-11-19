import type { Brief } from '../../../../lib/contracts.ts';
import type { HuntOptions } from '../src/options.ts';
import type { HuntResult, Usage, Observation } from '../src/contract.ts';
export const digest = 'sha256:' + 'a'.repeat(64);
export function brief(): Brief {
  return { episode_id: 'test-001', bench_version: 'test', app: 'test', track: 'exploration',
    targets: [{ name: 'app', url: 'http://127.0.0.1:1234/login' }], roles: [{ role: 'editor', accounts: [{ username: 'private-user', password: 'private-password' }] }], budget: { wall_time_s: 60 } };
}
export function options(dir: string): HuntOptions {
  return { briefPath: `${dir}/brief.json`, root: `${dir}/system`, out: `${dir}/out/findings.json`, policy: 'hunt-0.2', persona: 'default', model: 'anthropic:claude-haiku-5-5', maxUsd: 1, maxCalls: 40, operator: 'operator', live: false };
}
export function observation(): Observation {
  return { id: 'observation-1', title: 'private-user total mismatch', class: 'issue', category: 'consistency', severity: 3,
    expected: 'Sum of all rows', actual: 'private-password wrong total', reproduction: ['Open expenses', 'Compare private-user rows'],
    role: 'editor', path: '/expenses?token=secret#row', template: 'expenses', lens: 'sanity',
    evidence: { path: '/expenses', revision: 'revision', evidenceRefs: ['capture:private-password'] }, evidenceRefs: ['capture:private-password'],
    status: 'claimed', reason: 'OBSERVATION_CLAIMED', bucket: 'candidate' };
}
export function result(): HuntResult {
  return { schema: 'cri.bughunt-result/v1', missionDigest: digest, status: 'completed', cleanup: 'complete', policy: 'hunt-0.2', observations: [observation()], candidates: [] };
}
export function usage(): Usage { return { totals: { calls: 2, inputTokens: 30, outputTokens: 10, costUSD: 0.01 } }; }
