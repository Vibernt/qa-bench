// The run context every suite gets: browser pages with monitors attached, the rules gate, the
// collector, the time budget, and a `step` wrapper so one crashing check never stops the rest.
import type { Browser, BrowserContext, Page, Request, Response } from 'playwright';
import type { Brief, Category, Finding } from './types.ts';
import { Collector, clip, errorText } from './findings.ts';
import { normaliseRoute, sameOrigin } from './route.ts';
import { LoadGate, methodAllowed } from './rules.ts';
import { TEXT_FAULTS } from './invariants.ts';

export class OutOfTime extends Error {
  constructor() { super('time budget used up'); }
}

export interface MonitoredPage {
  page: Page;
  context: BrowserContext;
  monitor: PageMonitor;
  role?: string;
}

export interface SuiteContext {
  brief: Brief;
  browser: Browser;
  collector: Collector;
  gate: LoadGate;
  /** Origin of the first target, e.g. http://app:3000 */
  base: string;
  /** The first target's full URL. */
  targetUrl: string;
  timeLeftMs(): number;
  /** Throw OutOfTime when less than `needMs` of the budget is left. */
  ensureTime(needMs?: number): void;
  newPage(role?: string): Promise<MonitoredPage>;
  /** Navigate through the rules gate; returns the main response, or undefined when the gate refused. */
  goto(mp: MonitoredPage, url: string, opts?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'; timeout?: number }): Promise<Response | null | undefined>;
  step<T>(name: string, fn: () => Promise<T>): Promise<T | undefined>;
  log(message: string): void;
}

/** Console errors, uncaught exceptions, failed or >= 400 same-origin requests, dialogs: raised as they happen. */
export class PageMonitor {
  paused = false;
  readonly dialogs: string[] = [];
  private open = new Map<string, { finding: Finding; count: number; messages: Set<string> }>();
  private readonly collector: Collector;
  private readonly base: string;
  private readonly role: string | undefined;
  private readonly page: Page;
  /** Patterns of messages that are expected and not worth a finding (e.g. a probe the suite made on purpose). */
  readonly ignore: RegExp[] = [];

  constructor(page: Page, opts: { collector: Collector; base: string; role?: string }) {
    this.page = page;
    this.collector = opts.collector;
    this.base = opts.base;
    this.role = opts.role;
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      // Resource failures also log a console error; the request listeners report those, once.
      if (/^Failed to load resource/i.test(text)) return;
      const location = message.location();
      if (location.url && !sameOrigin(location.url, this.base) && !location.url.startsWith('data:')) return;
      this.raise('console', text);
    });
    page.on('pageerror', (error) => this.raise('pageerror', `${error.name}: ${error.message}`));
    page.on('response', (response) => this.onResponse(response));
    page.on('requestfailed', (request) => this.onFailed(request));
    page.on('dialog', (dialog) => {
      this.dialogs.push(`${dialog.type()}: ${dialog.message()}`);
      dialog.dismiss().catch(() => undefined);
    });
  }

  private currentRoute(): string {
    return normaliseRoute(this.page.url() || this.base);
  }

  private onResponse(response: Response): void {
    const url = response.url();
    const status = response.status();
    if (status < 400 || !sameOrigin(url, this.base)) return;
    if (/\/favicon\.ico$/.test(new URL(url).pathname)) return;
    const request = response.request();
    const isDocument = request.resourceType() === 'document' && request.frame() === this.page.mainFrame();
    // Images are judged by how they render (page.broken-image), not reported twice.
    if (request.resourceType() === 'image') return;
    if (isDocument) this.raise('document-status', `${request.method()} ${normaliseRoute(url)} returned HTTP ${status}`, normaliseRoute(url));
    else this.raise('resource-status', `${request.resourceType()} ${normaliseRoute(url)} returned HTTP ${status}`);
  }

  private onFailed(request: Request): void {
    const url = request.url();
    if (!sameOrigin(url, this.base)) return;
    const failure = request.failure()?.errorText ?? 'failed';
    // Aborted by us (rules) or by navigating away: not the app's fault.
    if (/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(failure)) return;
    this.raise('request-failed', `${request.method()} ${normaliseRoute(url)} failed: ${failure}`);
  }

  private raise(kind: 'console' | 'pageerror' | 'document-status' | 'resource-status' | 'request-failed', message: string, routeOverride?: string): void {
    if (this.paused || this.ignore.some((re) => re.test(message))) return;
    const route = routeOverride ?? this.currentRoute();
    const key = `monitor:${kind}|${route}`;
    const open = this.open.get(key);
    if (open) {
      open.count += 1;
      if (open.messages.size < 5 && !open.messages.has(message)) {
        open.messages.add(message);
        open.finding.evidence = [...(open.finding.evidence ?? []), { kind: kind === 'console' || kind === 'pageerror' ? 'console' : 'network', excerpt: clip(message, 500) }];
      }
      open.finding.description = describeMonitor(kind, route, open.count, [...open.messages][0] ?? message);
      return;
    }
    const category: Category = kind === 'console' || kind === 'pageerror' ? 'error-handling' : 'functional';
    const finding = this.collector.addNow({
      check: `page.${kind}`,
      key,
      category,
      route,
      ...(this.role ? { role: this.role } : {}),
      description: describeMonitor(kind, route, 1, message),
      evidence: [{ kind: kind === 'console' || kind === 'pageerror' ? 'console' : 'network', excerpt: clip(message, 500) }],
      confidence: kind === 'console' ? 0.5 : kind === 'pageerror' ? 0.6 : 0.7,
      repro: [`Open ${route}${this.role ? ` as ${this.role}` : ''} with the browser console and network panel open`],
    });
    if (finding) this.open.set(key, { finding, count: 1, messages: new Set([message]) });
  }
}

export function describeMonitor(kind: string, route: string, count: number, first: string): string {
  const [one, many] = ({
    console: ['console error', 'console errors'],
    pageerror: ['uncaught JavaScript exception', 'uncaught JavaScript exceptions'],
    'document-status': ['failed page request', 'failed page requests'],
    'resource-status': ['failed same-origin resource', 'failed same-origin resources'],
    'request-failed': ['failed same-origin request', 'failed same-origin requests'],
  } as Record<string, [string, string]>)[kind] ?? [kind, kind];
  return `${count} ${count === 1 ? one : many} on ${route}: ${clip(first.replace(/\s+/g, ' '), 200)}`;
}

export interface PageScan {
  text: string;
  brokenImages: { selector: string; src: string; box?: Box }[];
  missingAlt: { selector: string; src: string; box?: Box }[];
  unnamedButtons: { selector: string; html: string; box?: Box }[];
  textFaults: { id: string; match: string; selector?: string; box?: Box; context: string }[];
}
export interface Box { x: number; y: number; w: number; h: number }

/** Runs in the page: images, accessible names of buttons, and where text faults sit. */
export async function scanPage(page: Page, waitImagesMs = 3000): Promise<PageScan> {
  const patterns = TEXT_FAULTS.map((f) => ({ id: f.id, source: f.pattern.source, flags: f.pattern.flags }));
  return page.evaluate(async ({ patterns, waitImagesMs }) => {
    const boxOf = (el: Element): Box | undefined => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return undefined;
      return { x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height };
    };
    const css = (v: string): string => v.replace(/["\\]/g, '\\$&');
    const selectorOf = (el: Element): string => {
      for (const attr of ['data-test', 'data-testid']) {
        const v = el.getAttribute(attr);
        if (v) return `[${attr}="${css(v)}"]`;
      }
      if (el.id) return `#${CSS.escape(el.id)}`;
      const tag = el.tagName.toLowerCase();
      const name = el.getAttribute('name');
      if (name) return `${tag}[name="${css(name)}"]`;
      const aria = el.getAttribute('aria-label');
      if (aria) return `${tag}[aria-label="${css(aria)}"]`;
      if (tag === 'img') {
        const src = el.getAttribute('src');
        if (src && !src.startsWith('data:')) return `img[src="${css(src)}"]`;
      }
      const parent = el.parentElement;
      if (!parent) return tag;
      const index = Array.from(parent.children).filter((c) => c.tagName === el.tagName).indexOf(el) + 1;
      return `${selectorOf(parent)} > ${tag}:nth-of-type(${index})`;
    };
    const visible = (el: Element): boolean => {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const images = Array.from(document.images);
    await Promise.race([
      Promise.all(images.map((img) => (img.complete ? Promise.resolve() : new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      })))),
      new Promise((resolve) => setTimeout(resolve, waitImagesMs)),
    ]);
    const brokenImages = images
      .filter((img) => img.getAttribute('src') && img.complete && img.naturalWidth === 0 && getComputedStyle(img).display !== 'none' && img.loading !== 'lazy')
      .map((img) => ({ selector: selectorOf(img), src: img.currentSrc || img.src, box: boxOf(img) }));
    const missingAlt = images
      .filter((img) => !img.hasAttribute('alt') && visible(img) && img.getAttribute('role') !== 'presentation' && img.getAttribute('aria-hidden') !== 'true')
      .map((img) => ({ selector: selectorOf(img), src: img.currentSrc || img.src, box: boxOf(img) }));
    const nameOf = (el: Element): string => {
      const label = el.getAttribute('aria-label');
      if (label?.trim()) return label.trim();
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const text = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim();
        if (text) return text;
      }
      if (el instanceof HTMLInputElement) return (el.value || el.getAttribute('title') || '').trim();
      const text = (el.textContent ?? '').trim();
      if (text) return text;
      const alt = Array.from(el.querySelectorAll('img[alt], svg title')).map((n) => n.getAttribute('alt') ?? n.textContent ?? '').join(' ').trim();
      if (alt) return alt;
      return (el.getAttribute('title') ?? '').trim();
    };
    const unnamedButtons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"], input[type="reset"]'))
      .filter((el) => visible(el) && el.getAttribute('aria-hidden') !== 'true' && !nameOf(el))
      .map((el) => ({ selector: selectorOf(el), html: el.outerHTML.slice(0, 200), box: boxOf(el) }));
    const text = document.body?.innerText ?? '';
    const textFaults: PageScan['textFaults'] = [];
    for (const p of patterns) {
      const re = new RegExp(p.source, p.flags);
      const m = re.exec(text);
      if (!m) continue;
      // Find the element whose own text holds the match, for a selector and a region.
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let holder: Element | undefined;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (re.test(node.textContent ?? '') && node.parentElement && visible(node.parentElement)) { holder = node.parentElement; break; }
      }
      const tagged = holder?.closest('[data-test], [data-testid]') ?? holder;
      const start = Math.max(0, m.index - 40);
      textFaults.push({
        id: p.id, match: m[0],
        context: text.slice(start, m.index + m[0].length + 40).replace(/\s+/g, ' ').trim(),
        ...(tagged ? { selector: selectorOf(tagged), box: boxOf(tagged) } : {}),
      });
    }
    return { text, brokenImages, missingAlt, unnamedButtons, textFaults };
  }, { patterns, waitImagesMs });
}

/** Turn one page scan into findings (de-duplicated per check, route and selector). */
export async function reportScan(ctx: SuiteContext, mp: MonitoredPage, scan: PageScan, step?: string): Promise<void> {
  const route = normaliseRoute(mp.page.url());
  const role = mp.role;
  const common = { route, ...(role ? { role } : {}), ...(step ? { step } : {}) };
  const viewport = viewportText(mp.page);
  const broken = scan.brokenImages[0];
  if (broken) {
    // One report per page; every broken image is listed in the evidence.
    await ctx.collector.add({
      ...common, check: 'page.broken-image', category: 'visual', selector: broken.selector, key: `page.broken-image|${route}`,
      ...(broken.box ? { region: { ...broken.box, viewport } } : {}),
      description: `${scan.brokenImages.length} image(s) do not load on ${route}: ${clip(scan.brokenImages.map((i) => i.src).join(', '), 200)}`,
      evidence: [{ kind: 'dom', excerpt: scan.brokenImages.slice(0, 10).map((i) => `${i.selector} src=${i.src}`).join('\n') }],
      confidence: 0.8, page: mp.page,
      repro: [`Open ${route}`, `Look at ${broken.selector}: it renders as a broken image`],
    });
  }
  if (scan.missingAlt.length) {
    const first = scan.missingAlt[0]!;
    await ctx.collector.add({
      ...common, check: 'a11y.img-alt', category: 'a11y', selector: first.selector,
      description: `${scan.missingAlt.length} image(s) on ${route} have no alt attribute`,
      evidence: [{ kind: 'dom', excerpt: scan.missingAlt.slice(0, 5).map((i) => i.selector).join('\n') }],
      confidence: 0.6,
    });
  }
  if (scan.unnamedButtons.length) {
    const first = scan.unnamedButtons[0]!;
    await ctx.collector.add({
      ...common, check: 'a11y.button-name', category: 'a11y', selector: first.selector,
      description: `${scan.unnamedButtons.length} button(s) on ${route} have no accessible name`,
      evidence: [{ kind: 'dom', excerpt: scan.unnamedButtons.slice(0, 5).map((b) => b.html).join('\n') }],
      confidence: 0.6,
    });
  }
  for (const fault of scan.textFaults) {
    const what = TEXT_FAULTS.find((f) => f.id === fault.id)?.what ?? fault.id;
    await ctx.collector.add({
      ...common, check: `copy.${fault.id}`, category: 'copy',
      ...(fault.selector ? { selector: fault.selector } : {}),
      ...(fault.box ? { region: { ...fault.box, viewport } } : {}),
      description: `Page ${route} shows ${what}: "${clip(fault.context, 160)}"`,
      evidence: [{ kind: 'text', excerpt: fault.context }],
      confidence: 0.7, page: mp.page,
    });
  }
}

export function viewportText(page: Page): string {
  const v = page.viewportSize();
  return v ? `${v.width}x${v.height}` : '1280x720';
}

export interface ContextOptions {
  brief: Brief;
  browser: Browser;
  collector: Collector;
  gate: LoadGate;
  deadlineMs: number;
  log?: (message: string) => void;
}

export function createContext(opts: ContextOptions): SuiteContext {
  const target = opts.brief.targets[0];
  if (!target) throw new Error('brief has no targets');
  const base = new URL(target.url).origin;
  const log = opts.log ?? ((message: string) => process.stdout.write(`[playwright-suite] ${message}\n`));
  const pages: MonitoredPage[] = [];
  const ctx: SuiteContext = {
    brief: opts.brief,
    browser: opts.browser,
    collector: opts.collector,
    gate: opts.gate,
    base,
    targetUrl: target.url,
    timeLeftMs: () => opts.deadlineMs - Date.now(),
    ensureTime(needMs = 5000) {
      if (opts.deadlineMs - Date.now() < needMs) throw new OutOfTime();
    },
    async newPage(role) {
      const context = await opts.browser.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: false });
      const rules = opts.brief.rules;
      if (rules?.methods?.length || rules?.forms === false) {
        // Requests the rules forbid never leave the browser (page scripts included).
        await context.route('**/*', (route) => {
          const method = route.request().method();
          const formPost = rules.forms === false && route.request().isNavigationRequest() && method !== 'GET';
          if (!methodAllowed(rules, method) || formPost) return route.abort('blockedbyclient');
          return route.fallback();
        });
      }
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);
      page.setDefaultNavigationTimeout(30_000);
      const monitor = new PageMonitor(page, { collector: opts.collector, base, ...(role ? { role } : {}) });
      const mp: MonitoredPage = { page, context, monitor, ...(role ? { role } : {}) };
      pages.push(mp);
      return mp;
    },
    async goto(mp, url, gotoOpts) {
      const absolute = new URL(url, base).toString();
      const decision = await opts.gate.beforeLoad(absolute);
      if (!decision.ok) {
        opts.collector.note(`skipped ${normaliseRoute(absolute)}: ${decision.reason}`);
        return undefined;
      }
      return mp.page.goto(absolute, { waitUntil: gotoOpts?.waitUntil ?? 'load', ...(gotoOpts?.timeout ? { timeout: gotoOpts.timeout } : {}) });
    },
    async step(name, fn) {
      if (opts.deadlineMs - Date.now() < 3000) {
        opts.collector.note(`${name}: skipped, time budget used up`);
        return undefined;
      }
      log(`step ${name}`);
      try {
        return await fn();
      } catch (error) {
        if (error instanceof OutOfTime) {
          opts.collector.note(`${name}: stopped, time budget used up`);
          throw error;
        }
        opts.collector.note(`${name}: check crashed: ${errorText(error)}`);
        log(`step ${name} crashed: ${errorText(error)}`);
        return undefined;
      }
    },
    log,
  };
  return ctx;
}

