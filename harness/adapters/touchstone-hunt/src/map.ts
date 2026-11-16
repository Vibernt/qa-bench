import type { Brief, FindingsFile, Finding, Severity } from '../../../../lib/contracts.ts';
import { assertValid } from '../../../../lib/schemas.ts';
import type { HuntResult, Usage, Details } from './contract.ts';
import { meter } from './contract.ts';
import { cleanJson } from './privacy.ts';
const severities: Record<number, Severity> = { 1: 'minor', 2: 'minor', 3: 'major', 4: 'major', 5: 'critical' };
export function routePath(path: string | null, brief: Brief): string {
  if (path === null) return '*'; // Explicit unknown route; never infer it from a template or repro prose.
  if (typeof path !== 'string' || !path) throw new Error('Invalid observed route');
  const url = new URL(path, brief.targets[0]!.url);
  if (!brief.targets.some(t => new URL(t.url).origin === url.origin)) throw new Error('Claim route outside brief');
  return url.pathname;
}
export function convertHunt(brief: Brief, result: HuntResult, usage: Usage, wall: number, version: string,
  roles: Record<string, string> = {}): FindingsFile {
  if (result.schema !== 'cri.bughunt-result/v1' || !['completed', 'budget_exhausted', 'incomplete'].includes(result.status) || result.cleanup !== 'complete') throw new Error('Hunt did not complete with confirmed cleanup');
  const findings: Finding[] = [];
  function add(id: string, title: string, role: string, path: string | null, details: Details, refs: string[], status: string, reason: string) {
    const mappedRole = roles[role] ?? role;
    if (!brief.roles.some(r => r.role === mappedRole)) throw new Error('Claim role outside brief');
    if (!details || !severities[details.severity] || !['issue', 'warning'].includes(details.class) || !details.expected || !details.actual || !details.reproduction?.length) throw new Error('Invalid claim details');
    findings.push({ id: `hunt-${findings.length + 1}:${id}`, where: { route: routePath(path, brief), role: mappedRole }, category: details.category,
      severity: severities[details.severity], confidence: 0.5,
      description: `${title}\nExpected: ${details.expected}\nActual: ${details.actual}`,
      repro: details.reproduction, check: `${result.policy}:${details.class}`,
      evidence: [{ kind: 'text', excerpt: `${status}; ${reason}`, note: 'Model claim; confidence 0.5 is an uncalibrated adapter constant.' },
        ...refs.map(ref => ({ kind: 'other' as const, note: `Source evidence reference (not a downloaded bench artifact): ${ref}` }))] });
  }
  for (const o of result.observations ?? []) add(o.id, o.title, o.role, o.path, o, o.evidence?.evidenceRefs ?? o.evidenceRefs, o.status, o.reason);
  for (const c of result.candidates) {
    if (c.status !== 'finding') continue;
    add(c.id, c.summary, c.role, c.replays.at(-1)?.context?.finalUrl ?? null, c.details!, c.replays.flatMap(r => r.evidenceRefs), c.status, c.reason);
  }
  const cost = meter(usage, wall).model_usd;
  return assertValid<FindingsFile>('findings', cleanJson({ episode_id: brief.episode_id,
    system: { name: `touchstone-hunt-${result.policy}`, version }, findings, wall_time_s: wall,
    cost: { ...(cost === null ? {} : { model_usd: cost }), notes: `${cost === null ? 'Model cost unknown. ' : ''}Compute cost unmeasured; overhead retained separately.` },
    notes: (result.status === 'incomplete' ? `Hunt stopped early (${String(result.stopReason).replace(/[^A-Z0-9_]/g, '').slice(0, 60)}); findings recorded before the stop are included. ` : '') + 'Includes every observation, including warnings and missing captures, plus confirmed candidates. Unconfirmed replay candidates are excluded. Claims are not deterministic confirmations.' }, brief));
}
