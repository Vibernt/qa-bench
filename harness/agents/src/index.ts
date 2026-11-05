// Agent runs: drive LLM agents (or any outside agent) through bench episodes from an orchestrator.
//
//   prepare: bring each episode of a set up on 127.0.0.1 and write the agent's workspace (outside the repo):
//            brief.json, prompt.md, evidence/. Writes runs/<session>/agents.json (the manifest).
//   (the orchestrator runs one agent per episode with the config's model and effort, then writes usage.json)
//   finish:  sanitise each agent's findings to the schema, attach usage and cost, take the episodes down, import
//            the findings through the `human` (manual) adapter and score the run.
//
// Sealing: agents get only the brief. They run outside the sealed container, so the orchestrator audits each
// agent's commands for sealed paths (README.md); an episode with any hit is disqualified (its findings dropped).
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Brief, Category, Finding, FindingsFile, Report } from '../../../lib/contracts.ts';
import { readData, REPO_ROOT, writeJson } from '../../../lib/io.ts';
import { check } from '../../../lib/schemas.ts';
import { scoreRun } from '../../../scorer/src/index.ts';
import { DEFAULT_RUNS_ROOT, downEpisode, runEpisodes, upEpisode, type RunnerOptions } from '../../runner/src/index.ts';

export const AGENTS_ROOT = join(REPO_ROOT, 'harness', 'agents');
export const HARNESS_VERSION = '0.1.0';

export interface AgentConfig {
  id: string;
  driver: string;
  model: string;
  effort?: string;
  price?: { input: number; output: number; cache_read?: number };
}
export interface EpisodeSet { id: string; description?: string; episodes: string[] }

export interface ManifestEpisode {
  episode_id: string;
  workdir: string;
  prompt: string;
  brief: string;
  findings: string;
  session_dir: string;
  budget_s: number;
}
export interface Manifest {
  session: string;
  harness_version: string;
  config: AgentConfig;
  set: string;
  created_at: string;
  episodes: ManifestEpisode[];
}

/** What the orchestrator reports per episode. Tokens may be a total only. */
export interface EpisodeUsage {
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  duration_s?: number;
  tool_uses?: number;
  served_model?: string;
  audit?: { sealed_path_hits: number; checked: string; notes?: string };
  error?: string;
}
export interface UsageFile { episodes: Record<string, EpisodeUsage> }

const CATEGORIES: Category[] = ['functional', 'consistency', 'permission', 'error-handling', 'visual', 'copy', 'a11y', 'perf', 'usability', 'email', 'security-hygiene', 'l10n'];

export function loadConfigs(root = AGENTS_ROOT): AgentConfig[] {
  return readData<{ configs: AgentConfig[] }>(join(root, 'configs.yaml')).configs;
}
export function loadConfig(id: string, root = AGENTS_ROOT): AgentConfig {
  const c = loadConfigs(root).find((x) => x.id === id);
  if (!c) throw new Error(`no agent config '${id}' in ${join(root, 'configs.yaml')}`);
  return c;
}
export function loadSet(id: string, root = AGENTS_ROOT): EpisodeSet {
  const file = join(root, 'sets', `${id}.yaml`);
  if (!existsSync(file)) throw new Error(`no episode set '${id}' (looked for ${file})`);
  return readData<EpisodeSet>(file);
}

/** A readable summary of the brief for the prompt. Only brief fields; never anything sealed. */
export function briefSummary(b: Brief): string {
  const out: string[] = [];
  out.push(`- App: ${b.app} (track ${b.track}, episode ${b.episode_id})`);
  for (const t of b.targets) out.push(`- Open: ${t.url}`);
  for (const r of b.roles) for (const a of r.accounts) out.push(`- Sign in as **${r.role}**: username \`${a.username}\`, password \`${a.password}\``);
  if (!b.roles.length) out.push('- No sign-in is needed.');
  if (b.journeys?.length) {
    out.push('- Journeys to cover:');
    for (const j of b.journeys) out.push(`  - ${j.title} (as ${j.role}${j.start ? `, from ${j.start}` : ''}): ${j.steps.join('; ')}`);
  }
  if (b.pages?.length) out.push(`- Pages: ${b.pages.join(', ')}`);
  if (b.goal) out.push(`- Goal: ${b.goal}`);
  if (b.categories?.length) out.push(`- Categories in scope: ${b.categories.join(', ')}`);
  if (b.rules) out.push(`- Rules you must obey: ${JSON.stringify(b.rules)}`);
  out.push(`- Time budget: ${b.budget.wall_time_s} s${b.budget.money_usd !== undefined ? `, money budget $${b.budget.money_usd}` : ''}`);
  return out.join('\n');
}

export function renderPrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in vars ? vars[k]! : m));
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
}

export interface PrepareOptions extends RunnerOptions {
  /** Where agent workspaces go (default $QA_BENCH_AGENT_WORKDIR or <tmp>/qa-bench-agents). Keep it outside the repo. */
  workRoot?: string;
  session?: string;
  /** Override each brief's wall-time budget for the prompt (seconds). */
  budgetS?: number;
}

export async function prepareSession(configId: string, setId: string, opts: PrepareOptions = {}): Promise<Manifest> {
  const config = loadConfig(configId);
  const set = loadSet(setId);
  const session = opts.session ?? `agents-${config.id}-${stamp(new Date())}`.replace(/[^a-zA-Z0-9_-]+/g, '-');
  const workRoot = resolve(opts.workRoot ?? process.env.QA_BENCH_AGENT_WORKDIR ?? join(tmpdir(), 'qa-bench-agents'));
  if (workRoot.startsWith(REPO_ROOT + '/') || workRoot === REPO_ROOT) throw new Error('agent workspaces must be outside the repository');
  const runsRoot = opts.runsRoot ?? DEFAULT_RUNS_ROOT;
  const template = readFileSync(join(AGENTS_ROOT, 'prompt.md'), 'utf8');
  const manifest: Manifest = { session, harness_version: HARNESS_VERSION, config, set: set.id, created_at: new Date().toISOString(), episodes: [] };
  const manifestFile = join(runsRoot, session, 'agents.json');
  for (const id of set.episodes) {
    const { brief } = await upEpisode(id, { ...opts, runsRoot, sessionId: session, log: opts.log ?? (() => {}) });
    const workdir = join(workRoot, session, id);
    mkdirSync(join(workdir, 'evidence'), { recursive: true });
    writeJson(join(workdir, 'brief.json'), brief);
    const budget = opts.budgetS ?? brief.budget.wall_time_s;
    const findings = join(workdir, 'findings.json');
    const prompt = renderPrompt(template, {
      workdir, findings, episode_id: id, brief_summary: briefSummary(brief), budget_minutes: String(Math.max(1, Math.round(budget / 60))),
      system_name: config.id, system_version: `${config.model}${config.effort ? `@${config.effort}` : ''}`,
    });
    writeFileSync(join(workdir, 'prompt.md'), prompt);
    manifest.episodes.push({ episode_id: id, workdir, prompt: join(workdir, 'prompt.md'), brief: join(workdir, 'brief.json'), findings, session_dir: join(runsRoot, session, id), budget_s: budget });
    writeJson(manifestFile, manifest); // after each episode, so a failure part-way still leaves a manifest to clean up
  }
  return manifest;
}

/** Bring an agent's findings file into the schema: drop unknown fields and unrepairable findings. Pure. */
export function sanitiseFindings(raw: unknown, episodeId: string, system: { name: string; version: string }): { file: FindingsFile; dropped: number; repaired: number } {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const list = Array.isArray(src.findings) ? src.findings : [];
  const findings: Finding[] = [];
  let dropped = 0;
  let repaired = 0;
  list.forEach((x, i) => {
    const r = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    const w = (r.where && typeof r.where === 'object' ? r.where : {}) as Record<string, unknown>;
    const category = typeof r.category === 'string' ? (r.category.trim().toLowerCase() as Category) : undefined;
    const description = typeof r.description === 'string' ? r.description.trim() : '';
    if (!category || !CATEGORIES.includes(category) || !description) {
      dropped++;
      return;
    }
    let route = typeof w.route === 'string' && w.route ? w.route : '*';
    if (/^https?:\/\//.test(route)) {
      route = new URL(route).pathname;
      repaired++;
    }
    route = route.split(/[?#]/)[0] || '/';
    const where: Finding['where'] = { route };
    for (const k of ['role', 'step', 'selector'] as const) if (typeof w[k] === 'string' && w[k]) where[k] = w[k] as string;
    const reg = w.region as Record<string, unknown> | undefined;
    if (reg && ['x', 'y', 'w', 'h'].every((k) => typeof reg[k] === 'number')) where.region = { x: reg.x as number, y: reg.y as number, w: reg.w as number, h: reg.h as number };
    const conf = typeof r.confidence === 'number' && Number.isFinite(r.confidence) ? Math.min(1, Math.max(0, r.confidence)) : 0.5;
    const f: Finding = { id: typeof r.id === 'string' && r.id ? r.id : `f${i + 1}`, where, category, description, confidence: conf };
    const sev = typeof r.severity === 'string' ? r.severity.trim().toLowerCase() : '';
    if (sev === 'critical' || sev === 'major' || sev === 'minor') f.severity = sev;
    if (Array.isArray(r.repro)) f.repro = r.repro.filter((s): s is string => typeof s === 'string');
    if (Array.isArray(r.evidence)) {
      const ev = r.evidence.flatMap((e) => {
        const o = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>;
        const kinds = ['screenshot', 'network', 'dom', 'console', 'text', 'timing', 'trace', 'other'];
        const kind = typeof o.kind === 'string' && kinds.includes(o.kind) ? o.kind : 'other';
        const item: NonNullable<Finding['evidence']>[number] = { kind: kind as never };
        if (typeof o.path === 'string') item.path = o.path;
        if (typeof o.excerpt === 'string') item.excerpt = o.excerpt.slice(0, 2000);
        if (typeof o.note === 'string') item.note = o.note;
        return [item];
      });
      if (ev.length) f.evidence = ev;
    }
    if (typeof r.detected_at_s === 'number' && r.detected_at_s >= 0) f.detected_at_s = r.detected_at_s;
    findings.push(f);
  });
  // Unique ids.
  const seen = new Set<string>();
  for (const f of findings) {
    let id = f.id;
    for (let n = 2; seen.has(id); n++) id = `${f.id}-${n}`;
    seen.add(id);
    f.id = id;
  }
  const file: FindingsFile = { episode_id: episodeId, system, findings };
  if (typeof src.notes === 'string') file.notes = src.notes.slice(0, 2000);
  return { file, dropped, repaired };
}

/** Estimated model cost. Exact when the split is known; otherwise a stated blend over the total. */
export function estimateCost(u: EpisodeUsage, price: AgentConfig['price']): { usd?: number; note: string } {
  if (!price) return { note: 'no price configured' };
  const cr = price.cache_read ?? price.input / 10;
  if (u.input_tokens !== undefined || u.output_tokens !== undefined) {
    const usd = ((u.input_tokens ?? 0) * price.input + (u.output_tokens ?? 0) * price.output + (u.cache_read_tokens ?? 0) * cr) / 1e6;
    return { usd, note: 'from the reported token split' };
  }
  if (u.total_tokens === undefined) return { note: 'no token count reported' };
  // Agent loops are dominated by re-read context: assume 85% cache reads, 10% fresh input, 5% output.
  const usd = (u.total_tokens * (0.85 * cr + 0.10 * price.input + 0.05 * price.output)) / 1e6;
  const lo = (u.total_tokens * cr) / 1e6;
  const hi = (u.total_tokens * price.input * 0.95 + u.total_tokens * price.output * 0.05) / 1e6;
  return { usd, note: `estimate from ${u.total_tokens} total tokens (85% cache read / 10% input / 5% output); range $${lo.toFixed(4)}-$${hi.toFixed(4)}` };
}

export interface FinishOptions extends RunnerOptions { usage?: UsageFile; keepUp?: boolean }

export async function finishSession(session: string, opts: FinishOptions = {}): Promise<Report> {
  const runsRoot = opts.runsRoot ?? DEFAULT_RUNS_ROOT;
  const runDir = join(runsRoot, session);
  const manifest = readData<Manifest>(join(runDir, 'agents.json'));
  const system = { name: manifest.config.id, version: `${manifest.config.model}${manifest.config.effort ? `@${manifest.config.effort}` : ''}` };
  const importDir = join(runDir, '_import');
  mkdirSync(importDir, { recursive: true });
  const notes: string[] = [];
  for (const ep of manifest.episodes) {
    const u = opts.usage?.episodes[ep.episode_id] ?? {};
    const keep = join(runDir, ep.episode_id, 'agent');
    mkdirSync(keep, { recursive: true });
    for (const f of ['prompt.md', 'brief.json', 'findings.json']) if (existsSync(join(ep.workdir, f))) copyFileSync(join(ep.workdir, f), join(keep, f === 'findings.json' ? 'findings.raw.json' : f));
    writeJson(join(keep, 'usage.json'), u);
    let raw: unknown = {};
    let note = '';
    if (existsSync(ep.findings)) {
      try {
        raw = JSON.parse(readFileSync(ep.findings, 'utf8'));
      } catch (e) {
        note = `findings.json was not JSON (${(e as Error).message}); scored as no findings`;
      }
    } else note = 'the agent wrote no findings.json';
    const sanitised = sanitiseFindings(raw, ep.episode_id, system);
    const { dropped, repaired } = sanitised;
    let file = sanitised.file;
    if (u.audit && u.audit.sealed_path_hits > 0) {
      file = { episode_id: ep.episode_id, system, findings: [] };
      note = `DISQUALIFIED: ${u.audit.sealed_path_hits} reference(s) to sealed paths in the agent's commands; findings dropped`;
    }
    const cost = estimateCost(u, manifest.config.price);
    file.cost = { ...(cost.usd !== undefined ? { model_usd: Math.round(cost.usd * 1e6) / 1e6 } : {}), notes: cost.note };
    if (u.duration_s !== undefined) file.wall_time_s = Math.round(u.duration_s * 10) / 10;
    const parts = [file.notes, note, dropped ? `${dropped} finding(s) dropped as unrepairable` : '', repaired ? `${repaired} route(s) repaired from full URLs` : '', u.error ? `orchestrator: ${u.error}` : ''].filter(Boolean);
    if (parts.length) file.notes = parts.join('; ').slice(0, 2000);
    const errs = check('findings', file);
    if (errs.length) throw new Error(`sanitised findings for ${ep.episode_id} still invalid: ${errs.join('; ')}`);
    writeJson(join(importDir, `${ep.episode_id}.json`), file);
    if (note) notes.push(`${ep.episode_id}: ${note}`);
    if (!opts.keepUp && existsSync(join(ep.session_dir, 'session.json'))) await downEpisode(ep.session_dir, opts).catch((e) => notes.push(`${ep.episode_id}: teardown failed: ${(e as Error).message}`));
  }
  await runEpisodes({ adapter: 'human', episodes: manifest.episodes.map((e) => e.episode_id), runId: session }, { ...opts, runsRoot, findingsImport: importDir, log: opts.log ?? (() => {}) });
  const report = scoreRun(runDir, {
    system,
    notes: [`agent run: config ${manifest.config.id} (driver ${manifest.config.driver}, model ${manifest.config.model}, effort ${manifest.config.effort ?? 'default'}), set ${manifest.set}, harness ${HARNESS_VERSION}`, ...notes].join('\n'),
  });
  return report;
}
