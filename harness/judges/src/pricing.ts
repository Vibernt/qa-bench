export const PRICING_SOURCE = 'https://platform.claude.com/docs/en/about-claude/pricing';
export const PRICING_CHECKED = '2026-11-09';
export const LIMITS = { input: 16384, output: 1024 } as const;
export const MODELS = {
  'claude-haiku-5-5': { input: 0.10, output: 0.50 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-opus-5-5': { input: 4, output: 20 },
} as const;
export type Model = keyof typeof MODELS;
export function modelId(value: string): Model {
  if (!Object.hasOwn(MODELS, value)) throw new Error(`Unsupported model: ${value}`);
  return value as Model;
}
// Integer nanodollars avoid rounding an unaffordable call into the budget.
export function nanoCost(model: Model, input: number, output: number): number {
  for (const n of [input, output]) if (!Number.isSafeInteger(n) || n < 0) throw new Error('Invalid token usage');
  const p = MODELS[model];
  return Math.ceil(input * p.input * 1000 + output * p.output * 1000);
}
export class RunBudget {
  readonly cap: number;
  charged = 0;
  constructor(usd: number) {
    if (!Number.isFinite(usd) || usd <= 0 || usd > 1000) throw new Error('--max-usd must be >0 and <=1000');
    this.cap = Math.floor(usd * 1e9);
  }
  reserve(nano: number): boolean {
    if (!Number.isSafeInteger(nano) || nano < 0) throw new Error('Invalid reservation');
    if (this.charged + nano > this.cap) return false;
    this.charged += nano;
    return true;
  }
  settle(reserved: number, measured: number): void {
    if (!Number.isSafeInteger(measured) || measured < 0 || measured > reserved) throw new Error('Usage exceeded reservation; stop run');
    this.charged += measured - reserved;
  }
}
