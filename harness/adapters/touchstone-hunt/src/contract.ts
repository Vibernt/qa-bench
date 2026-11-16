import type { Category } from '../../../../lib/contracts.ts';
export interface Details { category: Category; class: 'issue' | 'warning'; severity: 1 | 2 | 3 | 4 | 5; expected: string; actual: string; reproduction: string[] }
export interface Observation extends Details {
  id: string; title: string; role: string; template: string; lens: string; path: string | null;
  evidence: { path: string; revision: string; evidenceRefs: string[] } | null;
  evidenceRefs: string[]; status: string; reason: string; bucket: string;
}
export interface Candidate {
  id: string; summary: string; role: string; template: string; details?: Details; status: string; reason: string;
  replays: { context?: { finalUrl: string }; evidenceRefs: string[] }[];
}
export interface HuntResult {
  schema: string; missionDigest: string; status: string; cleanup: string; policy: string;
  observations?: Observation[]; candidates: Candidate[];
}
export interface Usage { totals: { calls: number; inputTokens: number | null; outputTokens: number | null; costUSD: number | null } }
export interface Meter { model_usd: number | null; calls: number | null; tokens: number | null; wall_seconds: number }
export function meter(usage: Usage, wall: number): Meter {
  const t = usage.totals;
  for (const v of [t.calls, t.inputTokens, t.outputTokens, t.costUSD]) {
    if (v !== null && (!Number.isFinite(v) || v < 0)) throw new Error('Invalid usage totals');
  }
  if (!Number.isSafeInteger(t.calls)) throw new Error('Invalid usage calls');
  return { model_usd: t.costUSD, calls: t.calls, tokens: t.inputTokens === null || t.outputTokens === null ? null : t.inputTokens + t.outputTokens, wall_seconds: wall };
}
