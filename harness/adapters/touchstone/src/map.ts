import type { Brief, Category, FindingsFile, Severity } from '../../../../lib/contracts.ts';
import { assertValid } from '../../../../lib/schemas.ts';
import { sha256 } from '../../../../lib/io.ts';

export interface StepFinding {
  step: number; kind: 'console' | 'network' | 'a11y' | 'layout' | 'perf'; rule: string;
  severity: 'info' | 'minor' | 'serious' | 'critical'; message: string; target?: string;
  evidenceRefs: string[]; viewport: { width: number; height: number; mobile: boolean };
}
export interface CheckExport {
  schema: 'qa-bench.check-export/v1'; episode_id: string; brief_sha256: string;
  system: { name: string; version: string }; status: 'complete';
  wall_time_s: number;
  cost: { model_usd: number; compute_usd?: number; notes: string };
  observations: { page: string; role: string; findings: StepFinding[] }[];
}
const categories: Record<StepFinding['kind'], Category> = {
  console: 'error-handling', network: 'error-handling', a11y: 'a11y', layout: 'visual', perf: 'perf',
};
const severities: Record<Exclude<StepFinding['severity'], 'info'>, Severity> = {
  minor: 'minor', serious: 'major', critical: 'critical',
};
export function convertChecks(briefBytes: Buffer, data: CheckExport): FindingsFile {
  const brief = assertValid<Brief>('brief', JSON.parse(briefBytes.toString()));
  if (data.schema !== 'qa-bench.check-export/v1' || data.episode_id !== brief.episode_id ||
    data.brief_sha256 !== sha256(briefBytes) || data.status !== 'complete') throw new Error('Check export does not bind this completed bench invocation');
  if (!data.system?.name || !data.system.version || !Array.isArray(data.observations)) throw new Error('Invalid check export');
  const allowed = new Set(brief.targets.map(t => new URL(t.url).origin));
  const secrets = brief.roles.flatMap(r => r.accounts.flatMap(a => [a.username, a.password]));
  const clean = (s: string) => secrets.reduce((text, value) => value ? text.replaceAll(value, '[masked]') : text, s);
  const findings: FindingsFile['findings'] = [];
  for (const observation of data.observations) {
    const url = new URL(observation.page);
    if (!allowed.has(url.origin) || !brief.roles.some(r => r.role === observation.role)) throw new Error('Observation target or role is outside brief');
    for (const f of observation.findings) {
      if (!Object.hasOwn(categories, f.kind) || !['info', 'minor', 'serious', 'critical'].includes(f.severity) ||
        !Number.isSafeInteger(f.step) || f.step < 0 || !f.rule || !f.message || !Array.isArray(f.evidenceRefs)) throw new Error('Invalid check finding');
      // Informational performance readings are not allegations of a product defect.
      if (f.severity === 'info') continue;
      findings.push({ id: `check-${findings.length + 1}`, where: { route: url.pathname,
        role: observation.role, step: String(f.step), ...(f.target && !/^https?:/.test(f.target) ? { selector: clean(f.target) } : {}) },
        category: categories[f.kind], severity: severities[f.severity], confidence: 1,
        description: clean(f.message), check: clean(f.rule),
        evidence: [{ kind: 'text', excerpt: clean(f.message), note: `${f.viewport.width}x${f.viewport.height}; deterministic check` }],
        repro: [`Open ${url.pathname} as ${observation.role}`, `Run ${clean(f.rule)} at ${f.viewport.width}x${f.viewport.height}`] });
    }
  }
  const result: FindingsFile = { episode_id: brief.episode_id, system: data.system, findings,
    wall_time_s: data.wall_time_s, cost: data.cost,
    notes: 'Deterministic page checks only; no model judge, fixture DB oracle, journey mutation or managed promotion. Evidence references in the source export are not asserted to be locally downloaded artifacts.' };
  return assertValid<FindingsFile>('findings', result);
}
