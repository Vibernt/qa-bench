// Layout geometry sanity, measured in the page: key elements inside their containers, interactive
// elements not overlapping, repeated cards laid out alike, nothing rotated in the header. The pure
// comparison logic (outliers) is separate so it is unit-tested without a browser.
import type { Page } from 'playwright';

export interface Box { x: number; y: number; w: number; h: number }

/** Values that differ from the most common value by more than `tolerance` (index, value, mode). */
export function outliers(values: number[], tolerance = 3): { index: number; value: number; mode: number }[] {
  if (values.length < 3) return [];
  const counts = new Map<number, number>();
  for (const v of values) counts.set(Math.round(v), (counts.get(Math.round(v)) ?? 0) + 1);
  let mode = values[0] ?? 0;
  let best = 0;
  for (const [v, n] of counts) if (n > best) { best = n; mode = v; }
  // No clear majority: nothing to call an outlier.
  if (best <= values.length / 2) return [];
  return values.map((value, index) => ({ index, value, mode })).filter((o) => Math.abs(o.value - o.mode) > tolerance);
}

export function inside(inner: Box, outer: Box, slack = 2): boolean {
  return inner.x >= outer.x - slack && inner.y >= outer.y - slack
    && inner.x + inner.w <= outer.x + outer.w + slack && inner.y + inner.h <= outer.y + outer.h + slack;
}

export function overlapArea(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

export interface CardPart { selector: string; rel: Box }
export interface CardGeometry { card: Box; parts: Record<string, CardPart | undefined> }

/** Measure repeated cards: each part's box relative to its card (text parts measured by their text). */
export async function measureCards(page: Page, cardSelector: string, parts: Record<string, string>): Promise<CardGeometry[]> {
  return page.evaluate(({ cardSelector, parts }) => {
    const sel = (el: Element): string => {
      const dt = el.getAttribute('data-test') ?? el.getAttribute('data-testid');
      return dt ? `[${el.hasAttribute('data-test') ? 'data-test' : 'data-testid'}="${dt.replace(/["\\]/g, '\\$&')}"]` : el.tagName.toLowerCase();
    };
    return Array.from(document.querySelectorAll(cardSelector)).map((card) => {
      const c = card.getBoundingClientRect();
      const out: Record<string, { selector: string; rel: { x: number; y: number; w: number; h: number } } | undefined> = {};
      for (const [name, partSel] of Object.entries(parts)) {
        const el = card.querySelector(partSel);
        if (!el) { out[name] = undefined; continue; }
        let r = el.getBoundingClientRect();
        if (name.endsWith('Text')) {
          const range = document.createRange();
          range.selectNodeContents(el);
          r = range.getBoundingClientRect();
        }
        out[name] = { selector: sel(el), rel: { x: r.x - c.x, y: r.y - c.y, w: r.width, h: r.height } };
      }
      return { card: { x: c.x + window.scrollX, y: c.y + window.scrollY, w: c.width, h: c.height }, parts: out };
    });
  }, { cardSelector, parts });
}

export interface LayoutProblem { kind: 'grid' | 'overflow' | 'container' | 'overlap' | 'rotated' | 'offscreen'; selector: string; box?: Box; message: string }

/** Cards whose parts sit differently from the rest, or stick out of their card. */
export function gridProblems(cards: CardGeometry[], tolerance = 3): LayoutProblem[] {
  const problems: LayoutProblem[] = [];
  if (cards.length < 3) return problems;
  const names = Object.keys(cards[0]?.parts ?? {});
  for (const name of names) {
    const present = cards.map((c, i) => ({ i, part: c.parts[name] })).filter((p) => p.part) as { i: number; part: CardPart }[];
    const fields: [keyof Box, string][] = name.endsWith('Text') ? [['x', 'starts at x']] : [['x', 'x'], ['y', 'y'], ['w', 'width'], ['h', 'height']];
    for (const [field, label] of fields) {
      const outs = outliers(present.map((p) => p.part.rel[field]), tolerance);
      const first = outs[0];
      if (!first) continue;
      const p = present[first.index]!;
      const card = cards[p.i]!;
      problems.push({
        kind: 'grid', selector: p.part.selector,
        box: { x: card.card.x + p.part.rel.x, y: card.card.y + p.part.rel.y, w: p.part.rel.w, h: p.part.rel.h },
        message: `${name} in card ${p.i + 1} ${label} ${Math.round(first.value)}px vs ${first.mode}px in the other cards${outs.length > 1 ? ` (${outs.length} cards differ)` : ''}`,
      });
      break; // one problem per part
    }
    for (const p of present) {
      const card = cards[p.i]!;
      if (!name.endsWith('Text') && !inside(p.part.rel, { x: 0, y: 0, w: card.card.w, h: card.card.h }, 2)) {
        problems.push({
          kind: 'overflow', selector: p.part.selector,
          box: { x: card.card.x + p.part.rel.x, y: card.card.y + p.part.rel.y, w: p.part.rel.w, h: p.part.rel.h },
          message: `${name} in card ${p.i + 1} sticks out of its card`,
        });
      }
    }
  }
  // One report per element: a part that is both shifted and overflowing is one problem.
  const seen = new Set<string>();
  return problems.filter((p) => (seen.has(p.selector) ? false : (seen.add(p.selector), true)));
}

/** In-page sanity of the page chrome and controls. `containers` maps an element to the box it must sit in. */
export async function pageLayout(page: Page, opts: { containers: [string, string][]; rotationScope?: string }): Promise<LayoutProblem[]> {
  return page.evaluate(({ containers, rotationScope }) => {
    const problems: { kind: 'container' | 'overlap' | 'rotated' | 'offscreen'; selector: string; box?: { x: number; y: number; w: number; h: number }; message: string }[] = [];
    const boxOf = (el: Element): { x: number; y: number; w: number; h: number } => {
      const r = el.getBoundingClientRect();
      return { x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height };
    };
    const shown = (el: Element): boolean => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0 && r.width > 0 && r.height > 0;
    };
    const sel = (el: Element): string => {
      const dt = el.getAttribute('data-test');
      if (dt) return `[data-test="${dt.replace(/["\\]/g, '\\$&')}"]`;
      const dti = el.getAttribute('data-testid');
      if (dti) return `[data-testid="${dti.replace(/["\\]/g, '\\$&')}"]`;
      return el.id ? `#${el.id}` : el.tagName.toLowerCase();
    };
    // 1. Key elements inside their containers, and on screen horizontally.
    for (const [childSel, parentSel] of containers) {
      const child = document.querySelector(childSel);
      const parent = document.querySelector(parentSel);
      if (!child || !parent || !shown(child)) continue;
      const c = boxOf(child);
      const p = boxOf(parent);
      if (c.x < p.x - 2 || c.y < p.y - 2 || c.x + c.w > p.x + p.w + 2 || c.y + c.h > p.y + p.h + 2) {
        problems.push({ kind: 'container', selector: childSel, box: c, message: `${childSel} is outside ${parentSel} (at ${Math.round(c.x)},${Math.round(c.y)} ${Math.round(c.w)}x${Math.round(c.h)}; container ${Math.round(p.x)},${Math.round(p.y)} ${Math.round(p.w)}x${Math.round(p.h)})` });
      }
      if (c.x < 0 || c.x + c.w > document.documentElement.clientWidth) {
        problems.push({ kind: 'offscreen', selector: childSel, box: c, message: `${childSel} is partly off screen horizontally` });
      }
    }
    // 2. Visible interactive elements must not overlap one another (nested ones excepted).
    const interactive = Array.from(document.querySelectorAll('a[href], button, select, input:not([type="hidden"]), textarea, [role="button"]'))
      .filter((el) => shown(el) && !el.closest('[aria-hidden="true"], .bm-menu-wrap'));
    const boxes = interactive.map((el) => ({ el, box: el.getBoundingClientRect() }));
    for (let i = 0; i < boxes.length && problems.filter((p) => p.kind === 'overlap').length < 3; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const w = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left);
        const h = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top);
        if (w > 2 && h > 2) {
          problems.push({ kind: 'overlap', selector: sel(a.el), box: boxOf(a.el), message: `${sel(a.el)} overlaps ${sel(b.el)} by ${Math.round(w)}x${Math.round(h)}px` });
          break;
        }
      }
    }
    // 3. Nothing in the chrome is rotated or skewed.
    if (rotationScope) {
      const scope = document.querySelector(rotationScope);
      for (const el of scope ? [scope, ...Array.from(scope.querySelectorAll('*'))] : []) {
        if (!shown(el) || el.closest('.bm-menu-wrap')) continue;
        const t = getComputedStyle(el).transform;
        const m = /^matrix\(([^)]+)\)$/.exec(t);
        if (!m?.[1]) continue;
        const [, b, c] = m[1].split(',').map(Number);
        if (Math.abs(b ?? 0) > 0.001 || Math.abs(c ?? 0) > 0.001) {
          const deg = Math.round((Math.atan2(b ?? 0, Number(m[1].split(',')[0])) * 180) / Math.PI * 10) / 10;
          problems.push({ kind: 'rotated', selector: sel(el.hasAttribute('data-test') ? el : el.querySelector('[data-test]') ?? el), box: boxOf(el), message: `${sel(el)} is rotated by ${deg} degrees` });
        }
      }
    }
    return problems;
  }, opts);
}
