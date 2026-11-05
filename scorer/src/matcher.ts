import type { Finding, FoundBy, Label, Region } from '../../lib/contracts.ts';

/** Bump when matching rules change; it is recorded in every report. */
export const MATCHER_VERSION = 'deterministic-3';

/**
 * Category families. Testers disagree on the exact category of one symptom (a wrong total is "consistency" to one and
 * "functional" to another), so a finding in the same family as the label entry matches; the exact category scores
 * higher, so it wins when two labels compete. Families never cross, e.g. a copy finding can't match a functional bug.
 */
export const CATEGORY_FAMILIES: Record<string, string> = {
  functional: 'behaviour', consistency: 'behaviour', 'error-handling': 'behaviour', permission: 'behaviour',
  visual: 'presentation', copy: 'presentation', l10n: 'presentation', usability: 'presentation',
  a11y: 'a11y', perf: 'perf', email: 'email', 'security-hygiene': 'security-hygiene',
};
const familyOf = (c: string): string => CATEGORY_FAMILIES[c] ?? c;

const DEFAULT_REGION_PX = 48;

/** Strip origin, query and hash; collapse slashes; drop trailing slash and index.html. '*' is kept. */
export function normaliseRoute(route: string): string {
  let r = route.trim();
  if (r === '*') return '*';
  r = r.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, '');
  r = r.replace(/[?#].*$/, '');
  if (!r.startsWith('/')) r = '/' + r;
  r = r.replace(/\/{2,}/g, '/');
  r = r.replace(/\/index\.html?$/i, '');
  r = r.replace(/\/+$/, '');
  return r === '' ? '/' : r;
}

/** Drop quotes, collapse whitespace: `[data-test="x"]` ≡ `[data-test=x]` ≡ `[data-test='x']`. */
export function normaliseSelector(sel: string): string {
  return sel.replace(/["'`]/g, '').replace(/\s+/g, ' ').trim();
}

export function selectorsMatch(a: string, b: string): boolean {
  const x = normaliseSelector(a);
  const y = normaliseSelector(b);
  if (!x || !y) return false;
  return x.includes(y) || y.includes(x);
}

/** Regions match when they overlap or the gap between them is at most `tolPx` on each axis. */
export function regionsNear(a: Region, b: Region, tolPx: number): boolean {
  const gapX = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w), 0);
  const gapY = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h), 0);
  return gapX <= tolPx && gapY <= tolPx;
}

export interface MatchResult { ok: boolean; reason: string; score: number }

/**
 * Compare one finding to one label. Any single `found_by` entry may match.
 * Success scores are >= 10 (higher = more specific: exact route 3 / prefix 2 / wildcard 1, role equal +1, exact
 * category +1 (same family +0), locator matched +4, all on top of 10). Failure scores are 0..3 = how many of route, role, category passed (3 = only the
 * locator failed), so the closest failure can be reported.
 */
export function matchFinding(f: Finding, label: Label): MatchResult {
  const entries: FoundBy[] = label.found_by.length ? label.found_by : [{ kind: 'behaviour' }];
  let best: MatchResult | null = null;
  const failures: MatchResult[] = [];
  entries.forEach((e, i) => {
    const r = matchEntry(f, label, e, i);
    if (r.ok) { if (!best || r.score > best.score) best = r; } else failures.push(r);
  });
  if (best) return best;
  failures.sort((a, b) => b.score - a.score);
  const top = failures[0]!;
  const reasons = [...new Set(failures.filter((x) => x.score === top.score).map((x) => x.reason))];
  return { ok: false, score: top.score, reason: reasons.join('; ') };
}

function matchEntry(f: Finding, label: Label, e: FoundBy, index: number): MatchResult {
  const tol = label.tolerance ?? {};
  const tag = `${label.id}[${index}]`;
  const fail = (score: number, why: string): MatchResult => ({ ok: false, score, reason: `${why} for ${label.id}` });
  let score = 10;

  // Route
  const lRoute = normaliseRoute(e.route ?? label.where.route);
  const fRoute = normaliseRoute(f.where.route);
  const routeMode = tol.route ?? 'exact';
  if (lRoute === '*' || routeMode === 'any') score += 1;
  else if (routeMode === 'prefix') {
    if (!fRoute.startsWith(lRoute)) return fail(0, `route ${fRoute} does not start with ${lRoute}`);
    score += fRoute === lRoute ? 3 : 2;
  } else {
    if (fRoute !== lRoute) return fail(0, `route ${fRoute} ≠ ${lRoute}`);
    score += 3;
  }

  // Role: a finding with no role still matches (single-role apps)
  const lRole = e.role ?? label.where.role;
  const fRole = f.where.role;
  if (lRole && (tol.role ?? 'exact') !== 'any' && fRole) {
    if (fRole !== lRole) return fail(1, `role ${fRole} ≠ ${lRole}`);
    score += 1;
  }

  // Category
  const lCat = e.category ?? label.category;
  const cats = [lCat, ...(e.also_categories ?? [])];
  if (cats.includes(f.category)) score += 1;
  else if (!cats.some((c) => familyOf(c) === familyOf(f.category))) {
    return fail(2, `category ${f.category} ≠ ${cats.join(' | ')} (family ${familyOf(f.category)} ≠ ${[...new Set(cats.map(familyOf))].join(' | ')})`);
  }

  // Description pattern (deterministic text match, for labels that share a route and category with others)
  if (e.description_pattern) {
    let re: RegExp;
    try { re = new RegExp(e.description_pattern, 'i'); } catch { return fail(3, `bad description_pattern on ${tag}`); }
    if (!re.test(f.description)) return fail(3, `description does not mention the symptom (/${e.description_pattern}/i)`);
    score += 2;
  }

  // Locator
  const fHas = !!(f.where.selector || f.where.region);
  const eHas = !!(e.selector || e.region);
  if (!fHas) {
    if (tol.require_locator && eHas) return fail(3, `finding has no selector or region (required)`);
    return { ok: true, score, reason: `matches ${tag}: route, role, category; finding has no locator` };
  }
  if (eHas) {
    const px = tol.region_px ?? DEFAULT_REGION_PX;
    const sel = e.selector && f.where.selector ? selectorsMatch(e.selector, f.where.selector) : null;
    const reg = e.region && f.where.region ? regionsNear(e.region, f.where.region, px) : null;
    if (sel === true || reg === true) {
      return { ok: true, score: score + 4, reason: `matches ${tag}: route, role, category and ${sel ? 'selector' : 'region'}` };
    }
    if (sel === false || reg === false) {
      const what = sel === false ? `selector ${f.where.selector} vs ${e.selector}` : 'region apart by more than ' + px + 'px';
      return fail(3, `locator mismatch (${what})`);
    }
    // Locators of different kinds cannot be compared: treated like a route-only match
  }
  return { ok: true, score, reason: `matches ${tag}: route, role, category; locators not comparable` };
}
