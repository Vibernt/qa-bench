// Pure mapping between the bench's brief/findings and the bench's run API (see README.md).
//
// The request and response shapes below ARE the contract: a QA system that serves them can be scored through this
// adapter with no code of its own in the bench. Field names are kept loose where systems differ (url or route,
// category or kind), and toCategory accepts common synonyms.
import { CATEGORIES, type Brief, type Category, type Cost, type Finding } from './types.ts';

/** What the adapter sends to start a run. Briefs and goals only; nothing that changes the system's stored state. */
export interface RunRequest {
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
  /** The bench never asks a system to promote what it learns into approved checks or journeys. */
  promote: false;
  /** Ask the system to keep anything it learns in this run out of its approved baselines. */
  ephemeral: true;
}

export interface RunStatus {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  error?: string;
  cost?: { model_usd?: number; compute_usd?: number; total_usd?: number };
  started_at?: string;
  finished_at?: string;
}

export interface SystemFinding {
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
export function toRunRequest(brief: Brief, project?: string): RunRequest {
  const req: RunRequest = {
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

// Systems' own names for kinds of problem, mapped to bench categories. Unknown kinds fall back to 'functional'.
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

/** System finding → bench finding. Pure. `runStartedMs` turns detected_at into seconds after start. */
export function toFinding(t: SystemFinding, index: number, runStartedMs?: number): Finding {
  const where: Finding['where'] = { route: toRoute(t.route ?? t.url) };
  if (t.role) where.role = t.role;
  if (t.step) where.step = t.step;
  if (t.selector) where.selector = t.selector;
  if (t.region) where.region = t.region;
  const description = [t.title, t.detail].filter(Boolean).join(': ') || `Finding ${t.id}`;
  const f: Finding = {
    id: `ts-${t.id || index + 1}`,
    where,
    category: toCategory(t.category ?? t.kind),
    description,
    confidence: clamp01(t.confidence, 0.5),
    check: t.kind ?? t.category ?? 'http-api',
  };
  if (t.screenshots?.length) f.evidence = t.screenshots.map((s) => ({ kind: 'screenshot' as const, note: s }));
  if (t.repro?.length) f.repro = t.repro;
  if (t.detected_at && runStartedMs !== undefined) {
    const ms = Date.parse(t.detected_at) - runStartedMs;
    if (Number.isFinite(ms) && ms >= 0) f.detected_at_s = Math.round(ms / 100) / 10;
  }
  return f;
}

/** The system meters its own cost; record what it reports. */
export function toCost(status: RunStatus | undefined): Cost {
  const c = status?.cost;
  if (!c) return { notes: 'The system reported no cost for this run' };
  const cost: Cost = { notes: 'As reported by the system' };
  if (typeof c.model_usd === 'number') cost.model_usd = c.model_usd;
  if (typeof c.compute_usd === 'number') cost.compute_usd = c.compute_usd;
  if (cost.model_usd === undefined && cost.compute_usd === undefined && typeof c.total_usd === 'number') {
    cost.compute_usd = c.total_usd;
    cost.notes = 'The system reported only a total; recorded as compute_usd';
  }
  return cost;
}

/** True when the API URL points at this machine (no approval needed for a system on this machine). */
export function isLocalApi(apiUrl: string): boolean {
  try {
    const host = new URL(apiUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]' || host === 'host.docker.internal';
  } catch {
    return false;
  }
}
