import Anthropic from '@anthropic-ai/sdk';
import { existsSync } from 'node:fs';
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages';
import { writeJson, sha256, readData } from '../../../lib/io.ts';
import { LIMITS, MODELS, nanoCost, PRICING_CHECKED, PRICING_SOURCE, RunBudget, type Model } from './pricing.ts';
import { makeRequest, parseAnswer, RUBRIC_VERSION, SYSTEM, REQUEST_SETTINGS } from './request.ts';
import { loadSet } from './fixtures.ts';
import type { JudgeRun } from './types.ts';
import { loadPlan } from './plan.ts';

/** Test seam mirrors only the two SDK methods used; tests never instantiate a client. */
export interface JudgeTransport {
  count(request: MessageCreateParamsNonStreaming): Promise<number>;
  create(request: MessageCreateParamsNonStreaming): Promise<{
    id: string; model: string; stop_reason: string | null;
    content: { type: string; text?: string }[];
    usage: { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null };
  }>;
}
export function sdkTransport(): JudgeTransport {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is required');
  // Explicit first-party URL; no environment proxy/provider substitution, retries or debug logs.
  const client = new Anthropic({ apiKey: key, baseURL: 'https://api.anthropic.com', maxRetries: 0,
    timeout: 120_000, logLevel: 'off' });
  return {
    count: async request => (await client.messages.countTokens({ model: request.model, system: request.system, messages: request.messages })).input_tokens,
    create: request => client.messages.create(request),
  };
}
export function planRun(manifest: string, model: Model, maxUsd: number) {
  const schema = readData<{ schema: string }>(manifest).schema;
  let cases: { id: string; kind: string }[];
  let digest: string;
  const evidenceReady = schema === 'qa-bench.judge-set/v1';
  if (schema === 'qa-bench.judge-plan/v1') {
    const plan = loadPlan(manifest);
    cases = plan.cases;
    digest = sha256(JSON.stringify(plan));
  } else {
    const { set, root, digest: setDigest } = loadSet(manifest);
    cases = set.cases; digest = setDigest;
    for (const c of set.cases) tryRequest(c, root, model);
  }
  new RunBudget(maxUsd);
  const perCall = nanoCost(model, LIMITS.input, LIMITS.output) / 1e9;
  return { model, evidence_ready: evidenceReady, cases: cases.map(c => ({ id: c.id, kind: c.kind })),
    messages_calls: cases.length, token_count_calls: cases.length,
    input_ceiling: LIMITS.input, output_ceiling: LIMITS.output, max_cost_per_call_usd: perCall,
    max_cost_usd: nanoCost(model, LIMITS.input, LIMITS.output) * cases.length / 1e9,
    cap_usd: maxUsd, all_calls_fit: perCall * cases.length <= maxUsd, manifest_sha256: digest,
    pricing_source: PRICING_SOURCE, pricing_checked: PRICING_CHECKED };
}
function tryRequest(...args: Parameters<typeof makeRequest>): ReturnType<typeof makeRequest> | null {
  try { return makeRequest(...args); } catch (error) { if (/input token ceiling/.test((error as Error).message)) return null; throw error; }
}
export async function runJudge(manifest: string, model: Model, maxUsd: number, output: string, transport?: JudgeTransport): Promise<JudgeRun> {
  if (existsSync(output)) throw new Error('Judge output already exists; start a fresh run');
  const { set, root, digest } = loadSet(manifest);
  // Preflight every input before the first network request.
  const requests = set.cases.map(c => tryRequest(c, root, model));
  const budget = new RunBudget(maxUsd);
  const p = MODELS[model];
  const run: JudgeRun = { schema: 'qa-bench.judge-run/v1', model,
    config_sha256: sha256(JSON.stringify({ model, limits: LIMITS, rubric: RUBRIC_VERSION, system: SYSTEM, settings: REQUEST_SETTINGS, sdk: '1.6.0' })),
    manifest_sha256: digest, max_usd: maxUsd, status: 'failed', calls: [],
    pricing: { source: PRICING_SOURCE, checked: PRICING_CHECKED, input_per_million: p.input, output_per_million: p.output } };
  const reserved = nanoCost(model, LIMITS.input, LIMITS.output);
  // Caller uses an exclusive fresh output directory; a reserved call is journaled before dispatch.
  writeJson(output, run);
  let gateway: JudgeTransport | undefined = transport;
  // A case whose evidence exceeds the judge's input ceiling is recorded as not judged (as the product's judge would refuse it), never sent.
  const notJudged = (id: string) => { run.calls.push({ case_id: id, answer: null, status: 'not_judged', input_tokens: null,
    output_tokens: null, cost_usd: 0, reserved_usd: 0, wall_time_ms: 0 }); writeJson(output, run); };
  for (const [i, request] of requests.entries()) {
    if (!request) { notJudged(set.cases[i]!.id); continue; }
    if (!budget.reserve(reserved)) { run.status = 'budget_stopped'; break; }
    gateway ??= sdkTransport();
    let counted: number;
    try { counted = await gateway.count(request); } catch { throw new Error('Token-count request failed; no Messages call made (provider details withheld)'); }
    if (!Number.isSafeInteger(counted) || counted < 0) throw new Error('Token-count response invalid; no Messages call made');
    if (counted > LIMITS.input) { budget.settle(reserved, 0); notJudged(set.cases[i]!.id); continue; }
    const call = { case_id: set.cases[i]!.id, answer: null, status: 'provider_error', input_tokens: null,
      output_tokens: null, cost_usd: null, reserved_usd: reserved / 1e9, wall_time_ms: 0 } satisfies JudgeRun['calls'][number];
    run.calls.push(call);
    writeJson(output, run);
    const start = Date.now();
    try {
      const response = await gateway.create(request);
      const record = run.calls.at(-1)!;
      record.wall_time_ms = Date.now() - start;
      record.response_id = response.id;
      record.response_model = response.model;
      const u = response.usage;
      if ((u.cache_creation_input_tokens ?? 0) !== 0 || (u.cache_read_input_tokens ?? 0) !== 0) throw new Error('Unexpected caching usage');
      const measured = nanoCost(model, u.input_tokens, u.output_tokens);
      record.input_tokens = u.input_tokens;
      record.output_tokens = u.output_tokens;
      record.cost_usd = measured / 1e9;
      budget.settle(reserved, measured);
      if (u.input_tokens > LIMITS.input || u.output_tokens > LIMITS.output) throw new Error('Provider exceeded configured token ceiling');
      record.status = 'invalid_output';
      if (response.stop_reason === 'end_turn') {
        try {
          record.answer = parseAnswer(response.content.filter(b => b.type === 'text').map(b => b.text).join(''));
          record.status = 'answered';
        } catch { /* Retain invalid_output, paid usage and a missing answer, never convert it to ok. */ }
      }
      writeJson(output, run);
    } catch (error) {
      run.calls.at(-1)!.wall_time_ms = Date.now() - start;
      writeJson(output, run);
      // Unknown billed usage remains reserved. Stop, rather than retrying or selecting another model.
      const status = error instanceof Anthropic.APIError && error.status ? ` HTTP ${error.status};` : '';
      // eslint-disable-next-line preserve-caught-error -- Provider causes may contain credentials and request bodies.
      throw new Error(`Messages call or usage validation failed;${status} run stopped, reservation retained (provider details withheld)`);
    }
  }
  if (run.calls.length === set.cases.length && run.calls.every(c => c.status !== 'provider_error')) run.status = 'complete';
  writeJson(output, run);
  return run;
}
