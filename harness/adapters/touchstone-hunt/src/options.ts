import { parseArgs } from 'node:util';
export interface HuntOptions {
  briefPath: string; root: string; out: string; policy: 'hunt-0.1' | 'hunt-0.2' | 'hunt-0.3';
  persona: 'default' | 'skeptic' | 'fuzzer'; model: string; maxUsd: number; maxCalls: number; operator: string; live: boolean;
  /** Overrides the brief's wall time for the hunt (a slower model needs longer); the brief is not changed. */
  wallS?: number;
  /** Model effort for exploration calls (Anthropic models). Default: the hunt tool's own default. */
  effort?: 'low' | 'medium' | 'high';
}
export function positive(value: unknown, name: string, integer = false): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || (integer && !Number.isSafeInteger(n))) throw new Error(`Invalid ${name}`);
  return n;
}
function effort(value: unknown): 'low' | 'medium' | 'high' {
  if (value !== 'low' && value !== 'medium' && value !== 'high') throw new Error('Unsupported effort');
  return value;
}
export function parseOptions(args: string[], set = false): HuntOptions & { set: string; totalUsd: number } {
  const options = Object.fromEntries(['brief', 'root', 'out', 'policy', 'persona', 'model', 'max-usd', 'max-calls', 'operator', 'wall-s', 'effort',
    ...(set ? ['set', 'total-usd'] : [])].map(k => [k, { type: 'string' as const }]));
  const parsed = parseArgs({ args, options: { ...options, live: { type: 'boolean' } }, strict: true, allowPositionals: false });
  const values = parsed.values as Record<string, string | boolean | undefined>;
  for (const key of Object.keys(values)) {
    if (args.filter(a => a === `--${key}` || a.startsWith(`--${key}=`)).length > 1) throw new Error(`Duplicate --${key}`);
  }
  for (const key of ['root', 'policy', 'model', 'max-usd', 'max-calls', 'operator', ...(set ? [] : ['brief', 'out'])]) {
    if (typeof values[key] !== 'string' || !String(values[key]).trim()) throw new Error(`Required --${key}`);
  }
  const policy = values.policy; const persona = values.persona ?? 'default';
  if (policy !== 'hunt-0.1' && policy !== 'hunt-0.2' && policy !== 'hunt-0.3') throw new Error('Unsupported policy');
  if (!['default', 'skeptic', 'fuzzer'].includes(String(persona))) throw new Error('Unsupported persona');
  if (!/^(anthropic:[a-zA-Z0-9._-]+|codex-cli:gpt-6\.1-sol)$/.test(String(values.model))) throw new Error('Touchstone CLI supports anthropic:<model> and codex-cli:gpt-6.1-sol only');
  const maxUsd = positive(values['max-usd'], '--max-usd');
  return { briefPath: String(values.brief ?? ''), root: String(values.root), out: String(values.out ?? ''), policy,
    persona: persona as HuntOptions['persona'], model: String(values.model), maxUsd, maxCalls: positive(values['max-calls'], '--max-calls', true),
    operator: String(values.operator), live: values.live === true,
    ...(values['wall-s'] === undefined ? {} : { wallS: positive(values['wall-s'], '--wall-s', true) }),
    ...(values.effort === undefined ? {} : { effort: effort(values.effort) }), set: String(values.set ?? 'v0.4-kinds-12'),
    totalUsd: values['total-usd'] === undefined ? maxUsd : positive(values['total-usd'], '--total-usd') };
}
