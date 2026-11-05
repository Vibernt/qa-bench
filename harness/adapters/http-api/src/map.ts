// Pure mapping between the bench's brief/findings and Touchstone's run API.
//
// VERIFY against Touchstone's docs/HANDOFF.md before the first real run: the request and response shapes below are
// the adapter's assumption of Touchstone's run API (this repo can't see Touchstone's code). Everything
// Touchstone-specific is in this file and client.ts, so fixing the shapes is a local change.
import { CATEGORIES, type Brief, type Category, type Cost, type Finding } from './types.ts';

/** What the adapter sends to start a run. Briefs and goals only; nothing that changes Touchstone's own state. */
export interface TouchstoneRunRequest {
  source: 'qa-bench';
  external_id: string;
  project?: string;
  targets: { name: string; url: string }[];
  accounts: { role: string; username: string; password: string }[];
  journeys?: { id: string; title: string; role: string; start?: string; steps: string[] }[];
  goal?: string;
  pages?: string[];
  inbox?: { address: string; api: string };
  rules?: Record<string, unknown>;
  categories?: string[];
  budget: { wall_time_s: number; money_usd?: number };
  /** The bench must never promote journeys (docs/HANDOFF.md, "Watch out for"). */
  promote: false;
  /** Ask Touchstone to keep anything it learns in this run out of its approved baselines. */
  ephemeral: true;
}

export interface TouchstoneRunStatus {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  error?: string;
  cost?: { model_usd?: number; compute_usd?: number; total_usd?: number };
  started_at?: string;
  finished_at?: string;
}

export interface TouchstoneFinding {
  id: string;
  url?: string;
  route?: string;
  role?: string;
  step?: string;
  selector?: string;
  region?: { x: number; y: number; w: number; h: number; viewport?: string };
  category?: string;
  kind?: string;
  title?: string;
  detail?: string;
  confidence?: number;
  repro?: string[];
  screenshots?: string[];
  detected_at?: string;
}

/** Brief → run request. Pure. */
export function toRunRequest(brief: Brief, project?: string): TouchstoneRunRequest {
  const req: TouchstoneRunRequest = {
    source: 'qa-bench',
    external_id: brief.episode_id,
    targets: brief.targets,
    accounts: brief.roles.flatMap((r) => r.accounts.map((a) => ({ role: r.role, username: a.username, password: a.password }))),
    budget: brief.budget,
    promote: false,
    ephemeral: true,
  };
  if (project) req.project = project;
  if (brief.journeys?.length) req.journeys = brief.journeys;
  if (brief.goal) req.goal = brief.goal;
  if (brief.pages?.length) req.pages = brief.pages;
  if (brief.inbox) req.inbox = brief.inbox;
  if (brief.rules) req.rules = brief.rules;
  if (brief.categories?.length) req.categories = brief.categories;
  return req;
}

// Touchstone's own names for kinds of problem, mapped to bench categories. Unknown kinds fall back to 'functional'.
const SYNONYMS: Record<string, Category> = {
  functional: 'functional', behaviour: 'functional', behavior: 'functional', journey: 'functional', replay: 'functional',
  consistency: 'consistency', invariant: 'consistency', calculation: 'consistency', mismatch: 'consistency',
  permission: 'permission', permissions: 'permission', access: 'permission', authz: 'permission',
  error: 'error-handling', 'error-handling': 'error-handling', fault: 'error-handling',
  visual: 'visual', layout: 'visual', screenshot: 'visual', design: 'visual',
  copy: 'copy', text: 'copy', content: 'copy',
  a11y: 'a11y', accessibility: 'a11y', axe: 'a11y', keyboard: 'a11y', focus: 'a11y',
  perf: 'perf', performance: 'perf', speed: 'perf', lcp: 'perf', cls: 'perf',
  usability: 'usability', ux: 'usability',
  email: 'email', inbox: 'email',
  security: 'security-hygiene', 'security-hygiene': 'security-hygiene', headers: 'security-hygiene',
  l10n: 'l10n', i18n: 'l10n', localisation: 'l10n', localization: 'l10n',
};

export function toCategory(raw: string | undefined): Category {
  if (!raw) return 'functional';
  const key = raw.trim().toLowerCase();
  if ((CATEGORIES as readonly string[]).includes(key)) return key as Category;
  return SYNONYMS[key] ?? SYNONYMS[key.split(/[./:_ -]/)[0] ?? ''] ?? 'functional';
}

/** URL or path → bare pathname, as the scorer compares routes. */
export function toRoute(urlOrPath: string | undefined): string {
  if (!urlOrPath) return '*';
  try {
    return new URL(urlOrPath, 'http://x').pathname || '/';
  } catch {
    return urlOrPath.split(/[?#]/)[0] || '/';
  }
}

function clamp01(n: number | undefined, fallback: number): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

/** Touchstone finding → bench finding. Pure. `runStartedMs` turns detected_at into seconds after start. */
export function toFinding(t: TouchstoneFinding, index: number, runStartedMs?: number): Finding {
  const where: Finding['where'] = { route: toRoute(t.route ?? t.url) };
  if (t.role) where.role = t.role;
  if (t.step) where.step = t.step;
  if (t.selector) where.selector = t.selector;
  if (t.region) where.region = t.region;
  const description = [t.title, t.detail].filter(Boolean).join(': ') || `Touchstone finding ${t.id}`;
  const f: Finding = {
    id: `ts-${t.id || index + 1}`,
    where,
    category: toCategory(t.category ?? t.kind),
    description,
    confidence: clamp01(t.confidence, 0.5),
    check: t.kind ?? t.category ?? 'touchstone',
  };
  if (t.screenshots?.length) f.evidence = t.screenshots.map((s) => ({ kind: 'screenshot' as const, note: s }));
  if (t.repro?.length) f.repro = t.repro;
  if (t.detected_at && runStartedMs !== undefined) {
    const ms = Date.parse(t.detected_at) - runStartedMs;
    if (Number.isFinite(ms) && ms >= 0) f.detected_at_s = Math.round(ms / 100) / 10;
  }
  return f;
}

/** Touchstone owns its own cost metering; record what it reports. */
export function toCost(status: TouchstoneRunStatus | undefined): Cost {
  const c = status?.cost;
  if (!c) return { notes: 'Touchstone reported no cost for this run' };
  const cost: Cost = { notes: 'As reported by Touchstone' };
  if (typeof c.model_usd === 'number') cost.model_usd = c.model_usd;
  if (typeof c.compute_usd === 'number') cost.compute_usd = c.compute_usd;
  if (cost.model_usd === undefined && cost.compute_usd === undefined && typeof c.total_usd === 'number') {
    cost.compute_usd = c.total_usd;
    cost.notes = 'Touchstone reported only a total; recorded as compute_usd';
  }
  return cost;
}

/** True when the API URL points at this machine (no approval needed for a local Touchstone). */
export function isLocalApi(apiUrl: string): boolean {
  try {
    const host = new URL(apiUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]' || host === 'host.docker.internal';
  } catch {
    return false;
  }
}
