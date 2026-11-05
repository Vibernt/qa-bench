import { describe, expect, it } from 'vitest';
import { MATCHER_VERSION, matchFinding } from '../src/index.ts';
import { normaliseRoute, normaliseSelector } from '../src/matcher.ts';
import { finding, label } from './helpers.ts';

const m = (f: ReturnType<typeof finding>, l: ReturnType<typeof label>) => matchFinding(f as never, l);

describe('route normalisation', () => {
  it('strips origin, query, hash, trailing slash and index.html', () => {
    expect(normaliseRoute('https://x.test:8080/cart.html?a=1#b')).toBe('/cart.html');
    expect(normaliseRoute('/cart/')).toBe('/cart');
    expect(normaliseRoute('/index.html')).toBe('/');
    expect(normaliseRoute('http://x.test')).toBe('/');
    expect(normaliseRoute('/a//b/index.htm')).toBe('/a/b');
    expect(normaliseRoute('*')).toBe('*');
  });
  it('normalises selector quotes and whitespace', () => {
    expect(normaliseSelector(`[data-test="x"]`)).toBe(normaliseSelector(`[data-test='x']`));
    expect(normaliseSelector(`[data-test=x]`)).toBe(normaliseSelector(`[data-test="x"]`));
    expect(normaliseSelector('  a   b ')).toBe('a b');
  });
  it('exposes a matcher version', () => expect(MATCHER_VERSION).toMatch(/^deterministic-/));
});

describe('route tolerance', () => {
  it('exact (default) ignores query and trailing slash but not other paths', () => {
    expect(m(finding('f', '/inventory.html/?x=1'), label('swag.x')).ok).toBe(true);
    const r = m(finding('f', '/cart.html'), label('swag.x'));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('route /cart.html ≠ /inventory.html for swag.x');
  });
  it('index.html is the same as the root', () => {
    expect(m(finding('f', '/'), label('swag.x', { where: { route: '/index.html' } })).ok).toBe(true);
  });
  it('prefix', () => {
    const l = label('swag.x', { where: { route: '/inventory' }, tolerance: { route: 'prefix' } });
    expect(m(finding('f', '/inventory-item.html'), l).ok).toBe(true);
    expect(m(finding('f', '/cart'), l).ok).toBe(false);
  });
  it('any and "*" match every route', () => {
    expect(m(finding('f', '/zzz'), label('swag.x', { tolerance: { route: 'any' } })).ok).toBe(true);
    expect(m(finding('f', '/zzz'), label('swag.x', { where: { route: '*' } })).ok).toBe(true);
  });
  it('a found_by route overrides the label route', () => {
    const l = label('swag.x', { found_by: [{ kind: 'value', route: '/cart.html' }] });
    expect(m(finding('f', '/cart.html'), l).ok).toBe(true);
    expect(m(finding('f', '/inventory.html'), l).ok).toBe(false);
  });
  it('any one found_by entry may match', () => {
    const l = label('swag.x', { found_by: [{ kind: 'value', route: '/a' }, { kind: 'text', route: '/b' }] });
    expect(m(finding('f', '/b'), l).ok).toBe(true);
  });
});

describe('role', () => {
  const l = label('swag.x', { where: { route: '/inventory.html', role: 'problem_user' } });
  it('omitted role still matches', () => expect(m(finding('f', '/inventory.html'), l).ok).toBe(true));
  it('equal role matches and scores higher', () => {
    const a = m(finding('f', '/inventory.html', 'functional', { role: 'problem_user' }), l);
    expect(a.ok).toBe(true);
    expect(a.score).toBeGreaterThan(m(finding('f', '/inventory.html'), l).score);
  });
  it('mismatched role fails', () => {
    const r = m(finding('f', '/inventory.html', 'functional', { role: 'standard_user' }), l);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('role standard_user ≠ problem_user');
  });
  it('tolerance.role any ignores the mismatch', () => {
    const t = { ...l, tolerance: { role: 'any' as const } };
    expect(m(finding('f', '/inventory.html', 'functional', { role: 'standard_user' }), t).ok).toBe(true);
  });
  it('found_by role overrides the label role', () => {
    const t = label('swag.x', { where: { route: '/inventory.html', role: 'a' }, found_by: [{ kind: 'value', role: 'b' }] });
    expect(m(finding('f', '/inventory.html', 'functional', { role: 'b' }), t).ok).toBe(true);
  });
});

describe('category', () => {
  it('must be equal', () => {
    const r = m(finding('f', '/inventory.html', 'visual'), label('swag.x'));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('category visual ≠ functional for swag.x');
  });
  it('found_by category overrides', () => {
    const l = label('swag.x', { found_by: [{ kind: 'text', category: 'copy' }] });
    expect(m(finding('f', '/inventory.html', 'copy'), l).ok).toBe(true);
  });
  it('accepts also_categories for the same evidence, and nothing else', () => {
    const l = label('swag.x', { found_by: [{ kind: 'value', category: 'consistency', also_categories: ['functional'] }] });
    expect(m(finding('f', '/inventory.html', 'functional'), l).ok).toBe(true);
    expect(m(finding('f', '/inventory.html', 'consistency'), l).ok).toBe(true);
    const r = m(finding('f', '/inventory.html', 'visual'), l);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('category visual ≠ consistency | functional for swag.x');
  });
});

describe('locators', () => {
  const sel = label('swag.x', { found_by: [{ kind: 'element', selector: '[data-test="price"]' }] });
  it('selectors match across quote styles and containment', () => {
    for (const s of ['[data-test=price]', "[data-test='price']", 'div.row [data-test="price"]']) {
      expect(m(finding('f', '/inventory.html', 'functional', { selector: s }), sel).ok, s).toBe(true);
    }
  });
  it('a matched locator scores above a route-only match', () => {
    const withSel = m(finding('f', '/inventory.html', 'functional', { selector: '[data-test=price]' }), sel);
    expect(withSel.score).toBeGreaterThan(m(finding('f', '/inventory.html'), sel).score);
  });
  it('different selectors do not match', () => {
    const r = m(finding('f', '/inventory.html', 'functional', { selector: '#other' }), sel);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('locator mismatch');
  });
  const reg = label('swag.x', { found_by: [{ kind: 'visual', region: { x: 100, y: 100, w: 50, h: 50 } }] });
  it('overlapping regions match', () => {
    expect(m(finding('f', '/inventory.html', 'functional', { region: { x: 120, y: 120, w: 10, h: 10 } }), reg).ok).toBe(true);
  });
  it('regions within region_px (default 48) match, beyond do not', () => {
    expect(m(finding('f', '/inventory.html', 'functional', { region: { x: 190, y: 100, w: 10, h: 10 } }), reg).ok).toBe(true); // gap 40
    expect(m(finding('f', '/inventory.html', 'functional', { region: { x: 220, y: 100, w: 10, h: 10 } }), reg).ok).toBe(false); // gap 70
  });
  it('tolerance.region_px widens or narrows the gap', () => {
    const far = finding('f', '/inventory.html', 'functional', { region: { x: 220, y: 100, w: 10, h: 10 } });
    expect(m(far, { ...reg, tolerance: { region_px: 100 } }).ok).toBe(true);
    const near = finding('f', '/inventory.html', 'functional', { region: { x: 190, y: 100, w: 10, h: 10 } });
    expect(m(near, { ...reg, tolerance: { region_px: 10 } }).ok).toBe(false);
  });
  it('finding without locator matches unless require_locator', () => {
    expect(m(finding('f', '/inventory.html'), sel).ok).toBe(true);
    const r = m(finding('f', '/inventory.html'), { ...sel, tolerance: { require_locator: true } });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('no selector or region');
  });
  it('a locator on the finding but none on the label entry is route-level', () => {
    expect(m(finding('f', '/inventory.html', 'functional', { selector: '#x' }), label('swag.x')).ok).toBe(true);
  });
  it('selector vs region only (not comparable) falls back to route-level', () => {
    expect(m(finding('f', '/inventory.html', 'functional', { region: { x: 0, y: 0, w: 1, h: 1 } }), sel).ok).toBe(true);
  });
});
