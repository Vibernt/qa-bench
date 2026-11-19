// Mutation validation for the expense app (BRIEF.md §8.3): for every label, the labelled symptom appears with its
// switch on, and the clean build does not show it. Several defects can be on at once (DEFECT=a,b,c), so it also runs
// multi-defect combinations: every member's symptom must show in one container. Native script (needs docker), not a
// CI test:
//   npx tsx apps/expense-app/verify.ts [--image <tag>]
// Builds the image unless --image is given. Most probes are plain HTTP (the app is server-rendered); the visual and
// accessibility probes use Chromium (Playwright) and measure what a person would see: element geometry, the element
// actually painted at a point, contrast ratios and focus styles.
import YAML from 'yaml';
import type { Label } from '../../lib/contracts.ts';
import { maskedLabelIds } from '../../lib/masking.ts';
import { kindProbes, kindSwitches, kindCombinations } from './verification/kinds.ts';
import { execFileSync } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const argImage = process.argv.indexOf('--image');
const image = argImage > 0 ? process.argv[argImage + 1]! : 'qa-bench-app-expense-app:verify';
if (argImage < 0) {
  // Behind a TLS-intercepting proxy, QA_BENCH_EXTRA_CA=<ca.pem> passes its CA as an optional build secret.
  const secret = process.env.QA_BENCH_EXTRA_CA ? ['--secret', `id=extra_ca,src=${process.env.QA_BENCH_EXTRA_CA}`] : [];
  execFileSync('docker', ['build', '-q', ...secret, '-t', image, here], { stdio: 'inherit' });
}

const VIEWER = { username: 'viewer-verify', password: 'verify-viewer-pw' };
const EDITOR = { username: 'editor-verify', password: 'verify-editor-pw' };

interface Row { title: string; category: string; cents: number }
interface App { base: string; env: Record<string, string>; stop(): void }

function start(env: Record<string, string>): App {
  const args = ['run', '-d', '--rm', '-p', '127.0.0.1::3000',
    '-e', `QA_BENCH_VIEWER_ACCOUNTS=${VIEWER.username}:${VIEWER.password}`,
    '-e', `QA_BENCH_EDITOR_ACCOUNTS=${EDITOR.username}:${EDITOR.password}`];
  for (const [k, v] of Object.entries(env)) args.push('-e', `${k}=${v}`);
  const id = execFileSync('docker', [...args, image], { encoding: 'utf8' }).trim();
  const port = execFileSync('docker', ['port', id, '3000/tcp'], { encoding: 'utf8' }).trim().split('\n')[0]!.split(':').pop();
  return { base: `http://127.0.0.1:${port}`, env, stop: () => { execFileSync('docker', ['rm', '-f', id], { stdio: 'ignore' }); } };
}

async function waitUp(app: App): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(app.base + '/login')).ok) return; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('app did not start');
}

async function login(app: App, who: { username: string; password: string }): Promise<string> {
  const res = await fetch(app.base + '/login', { method: 'POST', redirect: 'manual', body: new URLSearchParams(who) });
  const cookie = res.headers.get('set-cookie')?.split(';')[0];
  if (res.status !== 303 || !cookie) throw new Error(`login failed for ${who.username}: ${res.status}`);
  return cookie;
}

async function get(app: App, cookie: string, path: string): Promise<{ status: number; html: string }> {
  const res = await fetch(app.base + path, { headers: { cookie }, redirect: 'manual' });
  return { status: res.status, html: await res.text() };
}

async function post(app: App, cookie: string, path: string, form: Record<string, string>): Promise<{ status: number; location: string }> {
  const res = await fetch(app.base + path, { method: 'POST', headers: { cookie }, redirect: 'manual', body: new URLSearchParams(form) });
  return { status: res.status, location: res.headers.get('location') ?? '' };
}

function rows(html: string): Row[] {
  const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? '';
  return [...body.matchAll(/<tr><td>(.*?)<\/td><td>([a-z]+)<\/td><td>\$(-?[\d.]+)<\/td>/g)].map((m) => ({
    title: m[1]!, category: m[2]!, cents: Math.round(Number(m[3]) * 100),
  }));
}
function total(html: string): number {
  const m = html.match(/data-testid="total">Total: \$(-?[\d.]+)/);
  if (!m) throw new Error('no total');
  return Math.round(Number(m[1]) * 100);
}

const sum = (list: Row[]): number => list.reduce((s, r) => s + r.cents, 0);
/** What a browser submits for the edit form: the fields' values, and the selected option (else the first one). */
function editFormFields(html: string): Record<string, string> {
  const select = html.match(/<select name="category"[^>]*>([\s\S]*?)<\/select>/)?.[1] ?? '';
  const options = [...select.matchAll(/<option value="([^"]*)"( selected)?>/g)];
  return {
    title: html.match(/name="title" value="([^"]*)"/)?.[1]?.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&') ?? '',
    category: (options.find((o) => o[2]) ?? options[0])?.[1] ?? '',
    amount: html.match(/name="amount" type="number"[^>]*value="([^"]*)"/)?.[1] ?? '',
  };
}

// ---- browser helpers (visual and accessibility probes) -------------------------------------------------------
let browserPromise: Promise<Browser> | undefined;
const browser = (): Promise<Browser> => (browserPromise ??= chromium.launch());
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

/** Run `fn` on a fresh page, signed in as `who` (or signed out with `who` undefined), on /expenses. */
async function inBrowser<T>(app: App, who: { username: string; password: string } | undefined, viewport: { width: number; height: number }, fn: (page: Page) => Promise<T>): Promise<T> {
  const context = await (await browser()).newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  try {
    if (who) {
      await page.goto(app.base + '/login');
      await page.fill('[name=username]', who.username);
      await page.fill('[name=password]', who.password);
      await page.click('button[type=submit]');
      await page.waitForURL('**/expenses**');
    }
    return await fn(page);
  } finally { await context.close(); }
}

/** WCAG contrast ratio of an element's text colour against the first opaque background behind it. */
// Passed as source text: the test runner's transform would otherwise wrap the helper functions in a __name() call
// that doesn't exist in the page.
const CONTRAST_JS = `(el) => {
  const rgb = (c) => (c.match(/[\\d.]+/g) || []).map(Number);
  const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  let bg = [255, 255, 255];
  for (let n = el; n; n = n.parentElement) {
    const c = rgb(getComputedStyle(n).backgroundColor);
    if (c.length >= 3 && (c[3] === undefined ? 1 : c[3]) > 0.5) { bg = c; break; }
  }
  const a = lum(rgb(getComputedStyle(el).color)), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}`;
const contrastOf = (page: Page, selector: string): Promise<number> =>
  page.locator(selector).first().evaluate((el, src) => (0, eval)(src)(el) as number, CONTRAST_JS);

const LONG_TITLE = 'Annual partner conference registration and workshop fees';

// Each probe returns true when its symptom is present. Probes touch different rows, so the members of a
// combination can run one after another in the same container.
const probes: Record<string, (app: App) => Promise<boolean>> = {
  ...Object.fromEntries(Object.entries(kindProbes).map(([id, probe]) => [id, async (app: App) => {
    const cookie = await login(app, EDITOR);
    return probe({ get: path => get(app, cookie, path), post: async (path, form) => {
      const res = await fetch(app.base + path, { method: 'POST', headers: { cookie }, redirect: 'manual', body: new URLSearchParams(form) });
      return { status: res.status, location: res.headers.get('location') ?? '', html: await res.text() };
    } });
  }])),
  'expense.wrong-total': async (app) => {
    const { html } = await get(app, await login(app, VIEWER), '/expenses');
    return total(html) !== rows(html).reduce((s, r) => s + r.cents, 0);
  },
  'expense.ignored-filter': async (app) => {
    const { html } = await get(app, await login(app, VIEWER), '/expenses?category=meals');
    return rows(html).some((r) => r.category !== 'meals');
  },
  'expense.permission-bypass': async (app) => {
    const c = await login(app, VIEWER);
    const edit = await get(app, c, '/expenses/1/edit');
    const save = await post(app, c, '/expenses/1', { title: 'Train to Pune', category: 'travel', amount: '1.00' });
    return edit.status === 200 || save.status === 303;
  },
  'expense.stale-state': async (app) => {
    const c = await login(app, EDITOR);
    await get(app, c, '/expenses');
    await post(app, c, '/expenses', { title: 'Verify stale', category: 'office', amount: '3.00' });
    return !rows((await get(app, c, '/expenses')).html).some((r) => r.title === 'Verify stale');
  },
  'expense.missing-persistence': async (app) => {
    const c = await login(app, EDITOR);
    const saved = await post(app, c, '/expenses', { title: 'Verify persist', category: 'office', amount: '4.00' });
    const list = rows((await get(app, c, '/expenses')).html);
    return saved.location.includes('flash=saved') && !list.some((r) => r.title === 'Verify persist');
  },
  'expense.duplicate-write': async (app) => {
    const c = await login(app, EDITOR);
    await post(app, c, '/expenses', { title: 'Verify dup', category: 'office', amount: '5.00' });
    return rows((await get(app, c, '/expenses')).html).filter((r) => r.title === 'Verify dup').length > 1;
  },
  'expense.misleading-success': async (app) => {
    const c = await login(app, EDITOR);
    const saved = await post(app, c, '/expenses/4', { title: 'Client taxi', category: 'travel', amount: '99.00' });
    const row = rows((await get(app, c, '/expenses')).html).find((r) => r.title === 'Client taxi');
    return saved.location.includes('flash=updated') && row?.cents !== 9900;
  },
  // Subtle defects
  'expense.total-under-filter': async (app) => {
    const c = await login(app, VIEWER);
    const { html } = await get(app, c, '/expenses?category=meals');
    // Too high under a filter (wrong_total makes it too low instead, so the two can be told apart when both are on).
    return total(html) > sum(rows(html));
  },
  'expense.delete-open-to-viewer': async (app) => {
    const c = await login(app, VIEWER);
    const list = (await get(app, c, '/expenses')).html;
    const res = await post(app, c, '/expenses/3/delete', {});
    const after = rows((await get(app, c, '/expenses')).html);
    return !list.includes('/delete') && res.status === 303 && !after.some((r) => r.title === 'Notebooks');
  },
  'expense.edit-drops-cents': async (app) => {
    const c = await login(app, EDITOR);
    await post(app, c, '/expenses/5', { title: 'Coffee with team', category: 'meals', amount: '12.50' });
    await post(app, c, '/expenses', { title: 'Verify cents', category: 'meals', amount: '12.50' });
    const list = rows((await get(app, c, '/expenses')).html);
    return list.find((r) => r.title === 'Coffee with team')?.cents === 1200 && list.find((r) => r.title === 'Verify cents')?.cents === 1250;
  },
  'expense.long-title-truncated': async (app) => {
    const c = await login(app, EDITOR);
    const added = 'Verify long title on add';
    const edited = 'Printer paper and toner for March';
    await post(app, c, '/expenses', { title: added, category: 'office', amount: '6.00' });
    await post(app, c, '/expenses/6', { title: edited, category: 'office', amount: '24.50' });
    const titles = rows((await get(app, c, '/expenses')).html).map((r) => r.title);
    return titles.includes(added.slice(0, 20)) && !titles.includes(added) && titles.includes(edited.slice(0, 20)) && !titles.includes(edited);
  },
  'expense.title-not-escaped': async (app) => {
    const c = await login(app, EDITOR);
    await post(app, c, '/expenses', { title: '<b>qab</b>', category: 'office', amount: '2.00' });
    const { html } = await get(app, c, '/expenses');
    return html.includes('<td><b>qab</b></td>');
  },
  'expense.edit-resets-category': async (app) => {
    const c = await login(app, EDITOR);
    // Edit "Team lunch" (meals) as a browser would: change the amount, leave the category select alone.
    const fields = editFormFields((await get(app, c, '/expenses/2/edit')).html);
    await post(app, c, '/expenses/2', { ...fields, amount: '70.00' });
    return rows((await get(app, c, '/expenses')).html).find((r) => r.title.startsWith('Team lunch'))?.category !== 'meals';
  },
  // ---- visual and accessibility defects (browser) ----
  'expense.phone-layout-overflow': (app) => inBrowser(app, EDITOR, PHONE, async (page) => {
    // On a phone the first row's Delete button must be on screen; with the defect it is clipped off to the right
    // and the page can't be scrolled to it.
    const box = await page.locator('tbody tr').first().locator('button').boundingBox();
    const scrollable = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    return !!box && box.x >= PHONE.width && !scrollable;
  }),
  'expense.total-covers-last-row': (app) => inBrowser(app, VIEWER, DESKTOP, async (page) => {
    // The element painted at the middle of the last row's title is the total box, not the row.
    const cell = await page.locator('tbody tr').last().locator('td').first().boundingBox();
    if (!cell) return false;
    return page.evaluate(([x, y]) => !!document.elementFromPoint(x!, y!)?.closest('[data-testid="total"]'), [cell.x + 20, cell.y + cell.height / 2]);
  }),
  'expense.login-error-invisible': (app) => inBrowser(app, undefined, DESKTOP, async (page) => {
    await page.goto(app.base + '/login');
    await page.fill('[name=username]', VIEWER.username);
    await page.fill('[name=password]', 'not-the-password');
    await page.click('button[type=submit]');
    const text = (await page.locator('[role=alert]').innerText()).trim();
    return text === 'Invalid credentials' && (await contrastOf(page, '[role=alert]')) < 1.5;
  }),
  'expense.long-title-overflows': (app) => inBrowser(app, EDITOR, DESKTOP, async (page) => {
    // A long (but stored in full) title spills over the Category column instead of wrapping.
    await page.goto(app.base + '/expenses/new');
    await page.fill('[name=title]', LONG_TITLE);
    await page.fill('[name=amount]', '12.00');
    await page.click('button[type=submit]');
    await page.waitForURL('**/expenses**');
    const row = page.locator('tbody tr', { hasText: LONG_TITLE.slice(0, 20) }).last();
    const spill = await row.locator('td').first().evaluate((td) => td.scrollWidth - td.clientWidth);
    return spill > 40;
  }),
  'expense.low-contrast-text': (app) => inBrowser(app, VIEWER, DESKTOP, async (page) => (await contrastOf(page, 'tbody td:nth-child(2)')) < 3),
  'expense.focus-ring-removed': (app) => inBrowser(app, VIEWER, DESKTOP, async (page) => {
    // Tab to the filter's Apply button: the focused control shows no outline and no replacement ring.
    await page.locator('select[name=category]').focus();
    await page.keyboard.press('Tab');
    return page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el.tagName !== 'BUTTON') return false;
      const s = getComputedStyle(el);
      return (s.outlineStyle === 'none' || s.outlineWidth === '0px') && s.boxShadow === 'none';
    });
  }),
  'expense.amounts-misaligned': (app) => inBrowser(app, VIEWER, DESKTOP, async (page) => {
    // The amounts' right edges should line up (right-aligned under the heading); with the defect they are ragged.
    const rights = await page.locator('tbody td:nth-child(3)').evaluateAll((tds) => tds.map((td) => {
      const r = document.createRange(); r.selectNodeContents(td); return r.getBoundingClientRect().right;
    }));
    return Math.max(...rights) - Math.min(...rights) > 4;
  }),
  'expense.restyle': (app) => inBrowser(app, VIEWER, DESKTOP, async (page) =>
    (await page.locator('form[method=get] button').evaluate((b) => getComputedStyle(b).backgroundColor)) === 'rgb(11, 110, 95)'),
  'expense.relabel': async (app) => {
    const c = await login(app, EDITOR);
    const list = (await get(app, c, '/expenses')).html;
    const form = (await get(app, c, '/expenses/new')).html;
    return list.includes('New expense') && form.includes('Save expense') && form.includes('Expense title');
  },
};

/** Store an expense with these fields: add it, or, when the add isn't kept (missing_persistence), edit expense 1. */
async function writeExpense(app: App, cookie: string, fields: { title: string; category: string; amount: string }): Promise<void> {
  await post(app, cookie, '/expenses', fields);
  const list = await get(app, cookie, '/expenses');
  if (list.status === 200 && !list.html.includes(fields.title.slice(0, 20))) await post(app, cookie, `/expenses/${firstId(list.html)}`, fields);
}
/** The id of the first expense in a list page (probes that delete rows run before others in the masking matrix). */
const firstId = (html: string): string => html.match(/\/expenses\/(\d+)\/edit/)?.[1] ?? '1';

// Natural defects: real bugs present on every build, so they must show on the clean build.
const naturalProbes: Record<string, (app: App) => Promise<boolean>> = {
  'expense.huge-amount-breaks-list': async (app) => {
    const c = await login(app, EDITOR);
    const saved = await post(app, c, '/expenses', { title: 'Huge', category: 'office', amount: '99999999999999' });
    const list = await get(app, c, '/expenses');
    if (list.status === 500) return saved.status === 303;
    await post(app, c, `/expenses/${firstId(list.html)}`, { title: 'Huge', category: 'office', amount: '99999999999999' });
    return (await get(app, c, '/expenses')).status === 500;
  },
  'expense.rejected-form-loses-input': async (app) => {
    const c = await login(app, EDITOR);
    const res = await fetch(app.base + '/expenses', { method: 'POST', headers: { cookie: c }, redirect: 'manual', body: new URLSearchParams({ title: '   ', category: 'office', amount: '5.00' }) });
    const html = await res.text();
    return res.status === 400 && !/role="alert"/.test(html) && !html.includes('value="5.00"');
  },
  // [0] the Delete form submits on one click (no confirm handler); [1] the list after a delete shows no message.
  'expense.silent-delete': async (app) => {
    const c = await login(app, EDITOR);
    const list = (await get(app, c, '/expenses')).html;
    const form = list.match(/<form method="post" action="\/expenses\/(\d+)\/delete">[\s\S]*?<\/form>/);
    if (!form || /confirm|onsubmit|onclick/i.test(form[0])) return false;
    const res = await post(app, c, `/expenses/${form[1]}/delete`, {});
    const after = (await get(app, c, res.location || '/expenses')).html;
    // The delete happened (the edit page reads the database; the list may be cached by stale_state).
    return res.status === 303 && !/role="status"/.test(after) && (await get(app, c, `/expenses/${form[1]}/edit`)).status === 404;
  },
  'expense.zero-amount-accepted': async (app) => {
    const c = await login(app, EDITOR);
    const saved = await post(app, c, '/expenses', { title: 'Zero amount', category: 'office', amount: '0' });
    const negative = await post(app, c, '/expenses', { title: 'Negative amount', category: 'office', amount: '-5' });
    const negativeStatus = app.env.DEFECT?.split(',').includes('negative_amount_accepted') ? 303 : 400;
    const list = (await get(app, c, '/expenses?category=office')).html;
    return saved.status === 303 && negative.status === negativeStatus && rows(list).some((r) => r.title === 'Zero amount' && r.cents === 0);
  },
  'expense.no-security-headers': async (app) => {
    const c = await login(app, VIEWER);
    const pages = [await fetch(app.base + '/login'), await fetch(app.base + '/expenses', { headers: { cookie: c } })];
    return pages.every((r) => r.status === 200 && !['content-security-policy', 'x-frame-options', 'x-content-type-options'].some((h) => r.headers.has(h)));
  },
  'expense.flash-in-url': async (app) => {
    const c = await login(app, EDITOR);
    const saved = await post(app, c, '/expenses', { title: 'Flash check', category: 'office', amount: '1.00' });
    const reload1 = (await get(app, c, saved.location)).html;
    const reload2 = (await get(app, c, saved.location)).html;
    const fresh = await login(app, VIEWER);
    const forged = (await get(app, fresh, '/expenses?flash=saved')).html;
    return saved.location.includes('flash=') && [reload1, reload2, forged].every((h) => h.includes('Expense saved'));
  },
  // ---- found in the visual-track runs ----
  'expense.row-actions-unnamed': async (app) => {
    const html = (await get(app, await login(app, EDITOR), '/expenses')).html;
    const edits = [...html.matchAll(/<a href="\/expenses\/\d+\/edit"([^>]*)>([^<]*)<\/a>/g)];
    const deletes = [...html.matchAll(/<button type="submit"([^>]*)>Delete<\/button>/g)];
    return edits.length > 1 && deletes.length > 1 && edits.every((m) => m[2] === 'Edit' && !/aria-label/.test(m[1]!)) && deletes.every((m) => !/aria-label/.test(m[1]!));
  },
  'expense.phone-rows-unlabelled': (app) => inBrowser(app, VIEWER, PHONE, async (page) => {
    const head = await page.locator('thead').evaluate((e) => getComputedStyle(e).display);
    const cell = await page.locator('tbody td').first().evaluate((e) => getComputedStyle(e).display);
    return head === 'none' && cell === 'block';
  }),
  'expense.viewer-empty-actions-column': async (app) => {
    const html = (await get(app, await login(app, VIEWER), '/expenses')).html;
    const cells = [...(html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? '').matchAll(/<tr>(?:<td>[\s\S]*?<\/td>){3}<td>([\s\S]*?)<\/td><\/tr>/g)];
    return html.includes('<th>Actions</th>') && cells.length > 0 && cells.every((m) => m[1] === '');
  },
  'expense.no-thousands-separator': async (app) => {
    const c = await login(app, EDITOR);
    await writeExpense(app, c, { title: 'Separator check', category: 'office', amount: '1234.56' });
    const html = (await get(app, c, '/expenses')).html;
    return html.includes('$1234.56') && !html.includes('$1,234.56');
  },
  'expense.small-touch-targets': (app) => inBrowser(app, EDITOR, PHONE, async (page) => {
    const box = await page.locator('tbody tr').first().locator('a').boundingBox();
    return !!box && (box.height < 24 || box.width < 24);
  }),
  'expense.focus-ring-low-contrast': (app) => inBrowser(app, VIEWER, DESKTOP, async (page) => {
    await page.locator('select[name=category]').focus();
    await page.keyboard.press('Tab');
    const [outline, bg, style] = await page.evaluate(() => [getComputedStyle(document.activeElement!).outlineColor, getComputedStyle(document.body).backgroundColor, getComputedStyle(document.activeElement!).outlineStyle]);
    if (style === 'none') return false; // no ring at all (focus_ring_removed): nothing to measure
    const rgb = (c: string): number[] => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = (c: number[]): number => c.slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; })
      .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i]!, 0);
    const [a, b] = [lum(rgb(outline)), lum(rgb(bg))];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 3;
  }),
  'expense.unbroken-title-overflows': (app) => inBrowser(app, EDITOR, DESKTOP, async (page) => {
    const cookie = (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
    await writeExpense(app, cookie, { title: 'REF-' + '0123456789'.repeat(12), category: 'office', amount: '5.00' });
    await page.goto(app.base + '/expenses');
    // The table grows past the page (auto layout) or, with a fixed layout, the title spills out of its cell.
    return page.evaluate(() => {
      const t = document.querySelector('table')!.getBoundingClientRect();
      const m = document.querySelector('main')!.getBoundingClientRect();
      const cells = [...document.querySelectorAll('tbody td:first-child')] as HTMLElement[];
      return t.right > m.right + 4 || cells.some((c) => c.scrollWidth > c.clientWidth + 20);
    });
  }),
  'expense.control-borders-low-contrast': (app) => inBrowser(app, undefined, DESKTOP, async (page) => {
    await page.goto(app.base + '/login');
    const [border, bg] = await page.locator('input[name=username]').evaluate((e) => [getComputedStyle(e).borderTopColor, getComputedStyle(e.closest('form')!).backgroundColor]);
    const rgb = (c: string): number[] => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = (c: number[]): number => c.slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; })
      .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i]!, 0);
    const [a, b] = [lum(rgb(border)), lum(rgb(bg))];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 3;
  }),
  'expense.delete-missing-id': async (app) => {
    const c = await login(app, EDITOR);
    const del = await post(app, c, '/expenses/999/delete', {});
    const edit = await get(app, c, '/expenses/999/edit');
    return del.status === 303 && edit.status === 404;
  },
};

const switches: Record<string, Record<string, string>> = {
  ...kindSwitches,
  'expense.wrong-total': { DEFECT: 'wrong_total' },
  'expense.ignored-filter': { DEFECT: 'ignored_filter' },
  'expense.permission-bypass': { DEFECT: 'permission_bypass' },
  'expense.stale-state': { DEFECT: 'stale_state' },
  'expense.missing-persistence': { DEFECT: 'missing_persistence' },
  'expense.duplicate-write': { DEFECT: 'duplicate_write' },
  'expense.misleading-success': { DEFECT: 'misleading_success' },
  'expense.total-under-filter': { DEFECT: 'total_under_filter' },
  'expense.delete-open-to-viewer': { DEFECT: 'delete_open_to_viewer' },
  'expense.edit-drops-cents': { DEFECT: 'edit_drops_cents' },
  'expense.long-title-truncated': { DEFECT: 'long_title_truncated' },
  'expense.title-not-escaped': { DEFECT: 'title_not_escaped' },
  'expense.edit-resets-category': { DEFECT: 'edit_resets_category' },
  'expense.relabel': { VARIANT: 'relabel' },
  'expense.phone-layout-overflow': { DEFECT: 'layout_phone_overflow' },
  'expense.total-covers-last-row': { DEFECT: 'total_covers_last_row' },
  'expense.login-error-invisible': { DEFECT: 'alert_text_invisible' },
  'expense.long-title-overflows': { DEFECT: 'long_title_overflows' },
  'expense.low-contrast-text': { DEFECT: 'muted_text_low_contrast' },
  'expense.focus-ring-removed': { DEFECT: 'focus_ring_removed' },
  'expense.amounts-misaligned': { DEFECT: 'amounts_misaligned' },
  'expense.restyle': { VARIANT: 'restyle' },
};

// The deliberate restyle must not look like any planted visual defect.
const VISUAL = ['expense.phone-layout-overflow', 'expense.total-covers-last-row', 'expense.login-error-invisible', 'expense.long-title-overflows',
  'expense.low-contrast-text', 'expense.focus-ring-removed', 'expense.amounts-misaligned'];

// Multi-defect episodes: every member's symptom shows in one container, probed one after another. No two members
// share an exclusive group (expense-create, expense-update, expense-filter).
const combinations: string[][] = [
  ...kindCombinations,
  ['expense.wrong-total', 'expense.edit-drops-cents', 'expense.title-not-escaped'],
  ['expense.total-under-filter', 'expense.delete-open-to-viewer', 'expense.long-title-truncated'],
  ['expense.permission-bypass', 'expense.edit-resets-category', 'expense.duplicate-write'],
  ['expense.stale-state', 'expense.ignored-filter', 'expense.permission-bypass'],
  ['expense.missing-persistence', 'expense.misleading-success', 'expense.wrong-total'],
  ['expense.wrong-total', 'expense.total-under-filter', 'expense.edit-resets-category'],
  ['expense.phone-layout-overflow', 'expense.total-covers-last-row', 'expense.focus-ring-removed'],
  ['expense.long-title-overflows', 'expense.login-error-invisible', 'expense.low-contrast-text'],
  ['expense.amounts-misaligned', 'expense.wrong-total', 'expense.phone-layout-overflow'],
  ['expense.total-covers-last-row', 'expense.edit-drops-cents', 'expense.login-error-invisible'],
];

let failures = 0;
const clean = start({});
try {
  await waitUp(clean);
  // The clean build must complete the journeys and show no symptom. Each probe runs on a fresh container,
  // because probes write.
  for (const id of Object.keys(probes)) {
    const app = start({});
    try {
      await waitUp(app);
      const present = await probes[id]!(app);
      console.log(`${present ? 'FAIL' : 'ok  '} clean build does not show ${id}`);
      if (present) failures++;
    } finally { app.stop(); }
  }
} finally { clean.stop(); }

for (const [id, env] of Object.entries(switches)) {
  const app = start(env);
  try {
    await waitUp(app);
    const present = await probes[id]!(app);
    console.log(`${present ? 'ok  ' : 'FAIL'} ${id} shows with ${Object.entries(env).map(([k, v]) => `${k}=${v}`).join(' ')}`);
    if (!present) failures++;
  } finally { app.stop(); }
}

for (const members of combinations) {
  const env: Record<string, string> = {};
  for (const id of members) for (const [key, value] of Object.entries(switches[id]!)) env[key] = env[key] ? `${env[key]},${value}` : value;
  const app = start(env);
  try {
    await waitUp(app);
    const missing: string[] = [];
    for (const id of members) if (!(await probes[id]!(app))) missing.push(id);
    console.log(`${missing.length ? 'FAIL' : 'ok  '} DEFECT=${env.DEFECT} shows all ${members.length}${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
    if (missing.length) failures++;
  } finally { app.stop(); }
}

// Every planted defect and deliberate change has a switch and a probe, and nothing else does.
{
  const ids = ['mutations', 'changes', 'traps'].flatMap((k) => readdirSync(join(here, k)).map((d) => (readFileSync(join(here, k, d, 'label.yaml'), 'utf8').match(/^id: (\S+)/m) ?? [])[1])).sort();
  const same = JSON.stringify(ids) === JSON.stringify(Object.keys(switches).sort()) && JSON.stringify(ids) === JSON.stringify(Object.keys(probes).sort());
  console.log(`${same ? 'ok  ' : 'FAIL'} every planted and change label has a switch and a probe`);
  if (!same) failures++;
}

// With the deliberate restyle on, no visual defect shows.
{
  const app = start(switches['expense.restyle']!);
  try {
    await waitUp(app);
    const shown: string[] = [];
    for (const id of VISUAL) if (await probes[id]!(app)) shown.push(id);
    console.log(`${shown.length ? 'FAIL' : 'ok  '} VARIANT=restyle shows no visual defect${shown.length ? ` (shows ${shown.join(', ')})` : ''}`);
    if (shown.length) failures++;
  } finally { app.stop(); }
}

// Every natural label needs a probe, and every probe a label.
{
  const ids = readdirSync(join(here, 'natural')).map((d) => (readFileSync(join(here, 'natural', d, 'label.yaml'), 'utf8').match(/^id: (\S+)/m) ?? [])[1]).sort();
  const probed = Object.keys(naturalProbes).sort();
  const same = JSON.stringify(ids) === JSON.stringify(probed);
  console.log(`${same ? 'ok  ' : 'FAIL'} every natural label has a probe${same ? '' : ` (labels ${ids.join(', ')}; probes ${probed.join(', ')})`}`);
  if (!same) failures++;
}

for (const [id, probe] of Object.entries(naturalProbes)) {
  const app = start({});
  try {
    await waitUp(app);
    const present = await probe(app);
    console.log(`${present ? 'ok  ' : 'FAIL'} natural ${id} shows on the clean build`);
    if (!present) failures++;
  } finally { app.stop(); }
}

// Masking matrix: with each planted defect on, every natural defect still shows unless declared hidden
// through masked_by or masks (then it must not show and is omitted from the answer key). One container per defect; the probes run in an order where the destructive ones (deletes, the huge amount that breaks the list) go last.
{
  const labels: Label[] = ['natural', 'mutations', 'traps'].flatMap(kind =>
    readdirSync(join(here, kind)).map(d => YAML.parse(readFileSync(join(here, kind, d, 'label.yaml'), 'utf8')) as Label));
  const last = ['expense.silent-delete', 'expense.delete-missing-id', 'expense.huge-amount-breaks-list'];
  const order = [...Object.keys(naturalProbes).filter((id) => !last.includes(id)), ...last];
  for (const [defectId, env] of Object.entries(switches)) {
    if (!env.DEFECT) continue;
    const maskedIds = maskedLabelIds(labels, [defectId]);
    const app = start(env);
    const wrong: string[] = [];
    try {
      await waitUp(app);
      for (const id of order) {
        let shown: boolean;
        try { shown = await naturalProbes[id]!(app); } catch { shown = false; }
        // stale_state serves the list from a 60 s cache, so a symptom that needs a fresh write shows a minute late.
        if (!shown && env.DEFECT === 'stale_state') {
          await new Promise((r) => setTimeout(r, 61_000));
          try { shown = await naturalProbes[id]!(app); } catch { shown = false; }
        }
        const masked = maskedIds.has(id);
        if (shown === masked) wrong.push(`${id} ${shown ? 'shows although declared masked' : 'is masked without a declared relation'}`);
      }
    } finally { app.stop(); }
    console.log(`${wrong.length ? 'FAIL' : 'ok  '} naturals with ${defectId} on${wrong.length ? `: ${wrong.join('; ')}` : ''}`);
    if (wrong.length) failures++;
  }
}

// Generated accounts replace the seed logins.
{
  const app = start({});
  try {
    await waitUp(app);
    const res = await fetch(app.base + '/login', { method: 'POST', redirect: 'manual', body: new URLSearchParams({ username: 'viewer', password: 'viewer-test-password' }) });
    const ok = res.status === 401;
    console.log(`${ok ? 'ok  ' : 'FAIL'} seed login is refused when generated accounts are set`);
    if (!ok) failures++;
  } finally { app.stop(); }
}

if (browserPromise) await (await browserPromise).close();
console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
