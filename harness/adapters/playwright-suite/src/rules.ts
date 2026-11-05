// Behaviour rules from the brief (live noise sites): allowed methods, no forms, robots.txt,
// a minimum interval between page loads and a page cap. Enforced in code, not left to the suite.
import type { Rules } from './types.ts';

export interface RobotsGroup { agents: string[]; rules: { allow: boolean; path: string }[] }

/** Parse robots.txt into user-agent groups (RFC 9309; unknown lines ignored). */
export function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | undefined;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === 'allow' || key === 'disallow') {
      // An empty Disallow allows everything; it adds no rule.
      if (value === '') continue;
      current.rules.push({ allow: key === 'allow', path: value });
    }
  }
  return groups;
}

function ruleRegex(path: string): RegExp {
  const anchored = path.endsWith('$');
  const body = (anchored ? path.slice(0, -1) : path)
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`);
}

/**
 * Whether robots.txt lets `agent` fetch `path` (path plus query). The most specific group wins (an exact
 * product-token match, else `*`); within it the longest matching rule wins and Allow wins a tie.
 */
export function robotsAllows(groups: RobotsGroup[], path: string, agent = 'qa-bench'): boolean {
  const token = agent.toLowerCase();
  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && token.includes(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes('*'));
  let best: { allow: boolean; length: number } | undefined;
  for (const group of chosen) {
    for (const rule of group.rules) {
      if (!ruleRegex(rule.path).test(path)) continue;
      const length = rule.path.length;
      if (!best || length > best.length || (length === best.length && rule.allow && !best.allow)) {
        best = { allow: rule.allow, length };
      }
    }
  }
  return best ? best.allow : true;
}

/** Whether the brief's rules let the suite send this HTTP method at all. */
export function methodAllowed(rules: Rules | undefined, method: string): boolean {
  if (!rules?.methods || rules.methods.length === 0) return true;
  return (rules.methods as string[]).includes(method.toUpperCase());
}

export interface GateDecision { ok: boolean; reason?: string; waited_ms?: number }

/**
 * Gate every page load through the rules: page cap, robots.txt, minimum interval. One gate per run,
 * shared by every page the suite opens, so the interval holds across tabs too.
 */
export class LoadGate {
  private loads = 0;
  private lastLoadAt = -Infinity;
  private robots = new Map<string, RobotsGroup[]>();
  private queue: Promise<unknown> = Promise.resolve();
  readonly rules: Rules | undefined;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly fetchText: (url: string) => Promise<{ status: number; text: string }>;
  readonly agent: string;

  constructor(rules: Rules | undefined, deps: {
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
    fetchText?: (url: string) => Promise<{ status: number; text: string }>;
    agent?: string;
  } = {}) {
    this.rules = rules;
    this.now = deps.now ?? (() => Date.now());
    this.sleep = deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.fetchText = deps.fetchText ?? (async (url) => {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10_000) });
      return { status: response.status, text: response.status < 400 ? await response.text() : '' };
    });
    this.agent = deps.agent ?? 'qa-bench';
  }

  get pagesLoaded(): number { return this.loads; }

  get interval(): number { return this.rules?.min_interval_ms ?? 0; }

  /** Reserve one page load of `url`: waits out the interval, or refuses (cap reached, robots disallow). */
  beforeLoad(url: string): Promise<GateDecision> {
    const next = this.queue.then(() => this.decide(url));
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async decide(url: string): Promise<GateDecision> {
    const max = this.rules?.max_pages;
    if (max !== undefined && this.loads >= max) return { ok: false, reason: `max_pages ${max} reached` };
    if (this.rules?.robots_txt === 'honour') {
      const target = new URL(url);
      const groups = await this.robotsFor(target.origin);
      if (!robotsAllows(groups, target.pathname + target.search, this.agent)) {
        return { ok: false, reason: `robots.txt disallows ${target.pathname}` };
      }
    }
    const waitMs = Math.max(0, this.lastLoadAt + this.interval - this.now());
    if (waitMs > 0) await this.sleep(waitMs);
    this.lastLoadAt = this.now();
    this.loads += 1;
    return { ok: true, waited_ms: waitMs };
  }

  private async robotsFor(origin: string): Promise<RobotsGroup[]> {
    const cached = this.robots.get(origin);
    if (cached) return cached;
    let groups: RobotsGroup[];
    // The robots.txt fetch is itself a load, so it also respects the interval.
    const waitMs = Math.max(0, this.lastLoadAt + this.interval - this.now());
    if (waitMs > 0) await this.sleep(waitMs);
    this.lastLoadAt = this.now();
    try {
      const { status, text } = await this.fetchText(`${origin}/robots.txt`);
      // 4xx: no robots.txt, everything allowed. 5xx or network failure: be conservative, allow nothing.
      if (status >= 500) groups = [{ agents: ['*'], rules: [{ allow: false, path: '/' }] }];
      else groups = status >= 400 ? [] : parseRobots(text);
    } catch {
      groups = [{ agents: ['*'], rules: [{ allow: false, path: '/' }] }];
    }
    this.robots.set(origin, groups);
    return groups;
  }
}
