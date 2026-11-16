import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Brief, FindingsFile } from '../../../../lib/contracts.ts';
import { assertValid } from '../../../../lib/schemas.ts';
import { sha256 } from '../../../../lib/io.ts';
import type { HuntOptions } from './options.ts';
import type { HuntResult, Usage } from './contract.ts';
import { meter } from './contract.ts';
import { convertHunt } from './map.ts';
import { cleanJson, redact } from './privacy.ts';
import { assertOutputOutsideRoot } from './paths.ts';
import { execute, type Execute } from './process.ts';
export interface Meter { model_usd: number | null; calls: number | null; tokens: number | null; wall_seconds: number }
export interface NativeResult { findings?: FindingsFile; cost: Meter; planOnly: boolean }
export class HuntFailure extends Error {
  cost: Meter;
  constructor(message: string, cost: Meter) { super(message); this.cost = cost; }
}
function save(path: string, value: unknown) {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
export function localBrief(brief: Brief) {
  const origins = new Set(brief.targets.map(t => {
    const u = new URL(t.url);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) || !['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw new Error('Native hunt accepts local bench targets only');
    return u.origin;
  }));
  if (origins.size !== 1) throw new Error('Touchstone CLI supports one origin; multi-origin briefs require an upstream contract change');
  if (brief.rules && Object.keys(brief.rules).length) throw new Error('Brief rules cannot be represented by this CLI');
  if (!brief.roles.length || brief.roles.some(r => r.accounts.length !== 1)) throw new Error('CLI requires exactly one account per role; account selection is not inferred');
  return [...origins][0]!;
}
export async function nativeHunt(opts: HuntOptions, ports: { execute?: Execute; now?: () => number } = {}): Promise<NativeResult> {
  const now = ports.now ?? Date.now; const start = now();
  const cost: Meter = { model_usd: 0, calls: 0, tokens: 0, wall_seconds: 0 };
  let brief: Brief | undefined;
  try {
    brief = assertValid<Brief>('brief', JSON.parse(readFileSync(opts.briefPath, 'utf8')));
    const origin = localBrief(brief);
    const maxUsd = Math.min(opts.maxUsd, brief.budget.money_usd ?? opts.maxUsd);
    if (maxUsd <= 0) throw new Error('Brief money budget disallows model spend');
    if (existsSync(opts.out) || existsSync(opts.out + '.hunt')) throw new Error('Output exists; choose a fresh path');
    const root = resolve(opts.root); const entry = join(root, 'tools/huntbench/run.mjs');
    assertOutputOutsideRoot(opts.out, root);
    const version = `${opts.policy}+cli.${sha256(readFileSync(entry)).slice(0, 12)}`;
    const dir = resolve(opts.out + '.hunt');
    mkdirSync(dirname(resolve(opts.out)), { recursive: true }); mkdirSync(dir, { mode: 0o700 });
    // Credential-free role aliases avoid upstream's refusal when a role contains a username literal.
    // The brief's own role name is kept when it shares no text with any credential (the model needs to know which
    // role it is); otherwise a neutral alias is used.
    const literals = brief.roles.flatMap(r => r.accounts.flatMap(a => [a.username, a.password]));
    const alias = (role: string, i: number): string => literals.some(l => role.includes(l)) || !/^[A-Za-z][A-Za-z0-9_-]{0,40}$/.test(role) ? `benchRole${i + 1}` : role;
    const roles = Object.fromEntries(brief.roles.map((r, i) => [alias(r.role, i), r.role]));
    const input = { ...brief, roles: brief.roles.map((r, i) => ({ ...r, role: alias(r.role, i) })) };
    const inputPath = join(dir, 'brief.json'); save(inputPath, input);
    const args = [entry, '--origin', origin, '--allow-loopback', '--brief', inputPath,
      ...Object.keys(roles).flatMap(r => ['--role', `${r}=@brief`]), '--policy', opts.policy, '--persona', opts.persona,
      '--approve-writes', '--model', opts.model, '--max-usd', String(maxUsd), '--max-calls', String(opts.maxCalls),
      '--include-sign-in', '--json',
      '--wall-s', String(opts.wallS ?? brief.budget.wall_time_s), '--operator', opts.operator, '--out', join(dir, 'artifacts')];
    const run = ports.execute ?? execute;
    const timeout = (opts.wallS ?? brief.budget.wall_time_s) * 1000 + 30000;
    const planned = await run(args, dir, timeout);
    if (planned.code !== 0) throw new Error(`Plan exited ${planned.code}: ${planned.stderr}`);
    const plan = JSON.parse(planned.stdout) as { schema: string; digest: string; worstCaseUSD: number; mission: { origin: string } };
    if (plan.schema !== 'cri.huntbench-plan/v1' || !/^sha256:[a-f0-9]{64}$/.test(plan.digest) || !Number.isFinite(plan.worstCaseUSD) || plan.mission?.origin !== origin) throw new Error('Invalid printed plan contract');
    save(join(dir, 'plan.json'), cleanJson(plan, brief));
    if (!opts.live) { cost.wall_seconds = (now() - start) / 1000; save(opts.out + '.cost.json', cost); return { planOnly: true, cost }; }
    if (plan.worstCaseUSD > maxUsd) throw new Error('Printed worst-case reservation exceeds episode cap');
    Object.assign(cost, { model_usd: null, calls: null, tokens: null });
    const live = await run([...args, '--approve-digest', plan.digest, '--live'], dir, timeout);
    const artifacts = join(dir, 'artifacts');
    if (existsSync(join(artifacts, 'usage.json'))) Object.assign(cost, meter(JSON.parse(readFileSync(join(artifacts, 'usage.json'), 'utf8')) as Usage, (now() - start) / 1000));
    // A hunt that stopped early (exit 3) still wrote its result: what it recorded before the stop counts, as it
    // would for a tester who ran out of time. Anything else non-zero, or no result file, is a failure.
    if (live.code !== 0 && !(live.code === 3 && existsSync(join(artifacts, 'result.json')))) throw new Error(`Live hunt exited ${live.code}: ${live.stderr}`);
    const read = (name: string) => JSON.parse(readFileSync(join(artifacts, name), 'utf8'));
    const result = read('result.json') as HuntResult;
    if (result.policy !== opts.policy) throw new Error('Result policy differs from invocation');
    if (result.missionDigest !== plan.digest) throw new Error('Result digest differs from approved plan');
    read('triage.json'); read('overhead.json'); // Required retained CLI outputs, never used as scoring filters.
    cost.wall_seconds = (now() - start) / 1000;
    Object.assign(cost, meter(read('usage.json') as Usage, cost.wall_seconds));
    const findings = convertHunt(brief, result, read('usage.json') as Usage, cost.wall_seconds, version, roles);
    save(opts.out, findings); save(opts.out + '.cost.json', cost);
    return { findings, cost, planOnly: false };
  } catch (error) {
    cost.wall_seconds = (now() - start) / 1000;
    throw new HuntFailure(redact(error instanceof Error ? error.message : String(error), brief), cost);
  }
}
