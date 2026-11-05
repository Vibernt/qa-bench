// Scripted suite for the expense app (server-rendered HTML, roles viewer and editor). What a scripted
// QA team would automate from the brief's journeys: totals add up, the filter filters, add and edit
// persist and say what happened, the viewer is read-only in the UI and at the endpoints.
import type { Page } from 'playwright';
import type { MonitoredPage, SuiteContext } from '../context.ts';
import { reportScan, scanPage } from '../context.ts';
import { formatCents, parseMoney, quotedStrings, sumCents, toCents } from '../invariants.ts';
import { normaliseRoute } from '../route.ts';

const SEL = {
  table: 'table[aria-label="Expenses"]',
  rows: 'table[aria-label="Expenses"] tbody tr',
  total: '[data-testid="total"]',
  flash: '[role="status"]',
  alert: '[role="alert"]',
  filter: 'select[name="category"]',
  apply: 'form[action="/expenses"][method="get"] button[type="submit"]',
  addLink: 'a[href="/expenses/new"]',
  editLinks: 'a[href$="/edit"]',
  deleteButtons: 'form[action$="/delete"] button',
  username: 'input[name="username"]',
  password: 'input[name="password"]',
  signIn: 'form[action="/login"] button[type="submit"]',
  signOut: 'form[action="/logout"] button[type="submit"]',
  title: 'input[name="title"]',
  category: 'select[name="category"]',
  amount: 'input[name="amount"]',
} as const;

const NEW_TITLE = 'QA suite check expense';
const NEW_CATEGORY = 'office';
const NEW_AMOUNT = '12.34';

interface Row { title: string; category: string; amountText: string; amount: number | undefined; editHref: string | undefined }
interface ListView { rows: Row[]; totalText: string | undefined; total: number | undefined; flash: string | undefined }

type Account = { role: string; username: string; password: string };

/** The brief's account for a role, by exact name first, then by a loose match. */
export function pickAccount(roles: { role: string; accounts: { username: string; password: string }[] }[], wanted: string, loose: RegExp): Account | undefined {
  const role = roles.find((r) => r.role === wanted && r.accounts.length) ?? roles.find((r) => loose.test(r.role) && r.accounts.length);
  const account = role?.accounts[0];
  return role && account ? { role: role.role, ...account } : undefined;
}

async function readList(page: Page): Promise<ListView> {
  const rows = await page.$$eval(SEL.rows, (trs) => trs.map((tr) => {
    const cells = Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent ?? '').trim());
    return {
      title: cells[0] ?? '', category: cells[1] ?? '', amountText: cells[2] ?? '',
      editHref: tr.querySelector('a[href$="/edit"]')?.getAttribute('href') ?? undefined,
    };
  }));
  const totalText = (await page.locator(SEL.total).first().textContent({ timeout: 2000 }).catch(() => null))?.trim();
  const flash = (await page.locator(SEL.flash).first().textContent({ timeout: 500 }).catch(() => null))?.trim();
  return {
    rows: rows.map((r) => ({ ...r, editHref: r.editHref ?? undefined, amount: parseMoney(r.amountText) })),
    totalText, total: parseMoney(totalText), flash: flash || undefined,
  };
}

export function totalMismatch(view: { rows: { amount: number | undefined }[]; total: number | undefined }): string | undefined {
  if (view.total === undefined) return 'no total is shown';
  if (view.rows.some((r) => r.amount === undefined)) return 'a row has no readable amount';
  const sum = sumCents(view.rows.map((r) => r.amount as number));
  if (sum !== toCents(view.total)) return `the total shows ${formatCents(toCents(view.total))} but the ${view.rows.length} listed amounts add up to ${formatCents(sum)}`;
  return undefined;
}

/** A refused request: 401/403/404, or a redirect to the sign-in page. */
export function refused(status: number, location: string | undefined): boolean {
  if (status === 401 || status === 403 || status === 404) return true;
  return status >= 300 && status < 400 && /\/login\b/.test(location ?? '');
}

export async function expenseSuite(ctx: SuiteContext): Promise<void> {
  const viewer = pickAccount(ctx.brief.roles, 'viewer', /view|read/i);
  const editor = pickAccount(ctx.brief.roles, 'editor', /edit|write|admin/i);
  if (!viewer) ctx.collector.note('no viewer account in the brief: viewer checks skipped');
  if (!editor) ctx.collector.note('no editor account in the brief: editor checks skipped');
  const addJourney = ctx.brief.journeys?.find((j) => /add/i.test(j.id) || /^add/i.test(j.title));
  const addLabel = (addJourney ? quotedStrings(addJourney.steps)[0] : undefined) ?? 'Add expense';
  const url = (path: string): string => new URL(path, ctx.base).toString();
  const C = ctx.collector;

  const checkTotal = async (mp: MonitoredPage, view: ListView, step: string): Promise<void> => {
    const problem = totalMismatch(view);
    if (!problem) return;
    await C.add({
      check: 'expense.total-equals-sum', category: 'consistency', route: mp.page.url(), ...(mp.role ? { role: mp.role } : {}), step,
      selector: SEL.total, description: `Expense total is wrong: ${problem}`,
      evidence: [{ kind: 'dom', excerpt: `${view.totalText ?? '(no total)'}\n${view.rows.map((r) => `${r.title} | ${r.category} | ${r.amountText}`).join('\n')}` }],
      confidence: 0.95, page: mp.page,
      repro: [`Sign in as ${mp.role ?? 'any user'}`, `Open ${normaliseRoute(mp.page.url())}${new URL(mp.page.url()).search}`, 'Add up the Amount column and compare it with the total under the table'],
    });
  };
  const scan = async (mp: MonitoredPage, step: string): Promise<void> => {
    await reportScan(ctx, mp, await scanPage(mp.page, 1000), step);
  };
  const login = async (mp: MonitoredPage, account: Account): Promise<boolean> => {
    await ctx.goto(mp, url('/login'));
    await scan(mp, 'login');
    await mp.page.fill(SEL.username, account.username);
    await mp.page.fill(SEL.password, account.password);
    await submit(mp.page, SEL.signIn);
    const ok = normaliseRoute(mp.page.url()) === '/expenses' && (await mp.page.locator(SEL.table).count()) > 0;
    if (!ok) {
      await C.add({
        check: 'expense.sign-in', category: 'functional', route: '/login', role: account.role, step: 'login', selector: SEL.signIn,
        description: `The ${account.role} account from the brief cannot sign in (ended on ${normaliseRoute(mp.page.url())})`,
        confidence: 0.7, page: mp.page, repro: ['Open /login', `Sign in as the ${account.role} account from the brief`],
      });
    }
    return ok;
  };

  // 1. Signed-out access is refused.
  await ctx.step('expense.signed-out', async () => {
    const mp = await ctx.newPage();
    await ctx.goto(mp, url('/expenses'));
    if (normaliseRoute(mp.page.url()) !== '/login' || (await mp.page.locator(SEL.table).count()) > 0) {
      await C.add({
        check: 'expense.signed-out-redirect', category: 'permission', route: '/expenses', step: 'signed-out',
        description: `Signed out, /expenses is not redirected to /login (ended on ${normaliseRoute(mp.page.url())})`,
        confidence: 0.8, page: mp.page, repro: ['Clear cookies', 'Open /expenses'],
      });
    }
    // 2. A wrong password is refused with a message.
    if (viewer) {
      await ctx.goto(mp, url('/login'));
      await mp.page.fill(SEL.username, viewer.username);
      await mp.page.fill(SEL.password, `${viewer.password}-wrong`);
      mp.monitor.paused = true; // the 401 is the expected answer
      await submit(mp.page, SEL.signIn);
      mp.monitor.paused = false;
      if (normaliseRoute(mp.page.url()) === '/expenses') {
        await C.add({
          check: 'expense.wrong-password', category: 'permission', route: '/login', role: viewer.role, step: 'login',
          description: 'Signing in with a wrong password is accepted', confidence: 0.9, page: mp.page,
          repro: ['Open /login', `Enter the ${viewer.role} username with a wrong password`, 'Sign in'],
        });
      } else if ((await mp.page.locator(SEL.alert).count()) === 0) {
        await C.add({
          check: 'expense.wrong-password-message', category: 'error-handling', route: '/login', step: 'login', selector: SEL.alert,
          description: 'A wrong password shows no error message', confidence: 0.6, page: mp.page,
          repro: ['Open /login', 'Sign in with a wrong password'],
        });
      }
    }
    await mp.context.close();
  });

  const vp = viewer ? await ctx.newPage(viewer.role) : undefined;
  const ep = editor ? await ctx.newPage(editor.role) : undefined;
  const viewerIn = vp && viewer ? (await ctx.step('expense.viewer-sign-in', () => login(vp, viewer))) === true : false;
  const editorIn = ep && editor ? (await ctx.step('expense.editor-sign-in', () => login(ep, editor))) === true : false;
  let firstList: ListView | undefined;
  let editorList: ListView | undefined;

  // 3. List and total (viewer journey).
  if (viewerIn && vp) await ctx.step('expense.list', async () => {
    firstList = await readList(vp.page);
    await scan(vp, 'list');
    if (firstList.rows.length === 0) {
      await C.add({
        check: 'expense.list-empty', category: 'functional', route: '/expenses', role: vp.role, step: 'list', selector: SEL.table,
        description: 'The expense list is empty for a seeded app', confidence: 0.6, page: vp.page,
      });
    }
    await checkTotal(vp, firstList, 'list');
  });
  if (editorIn && ep) await ctx.step('expense.editor-list', async () => {
    editorList = await readList(ep.page);
    await checkTotal(ep, editorList, 'list');
  });

  // 4. Viewer is read-only: no controls, and the endpoints refuse.
  if (viewerIn && vp) await ctx.step('expense.viewer-readonly', async () => {
    await ctx.goto(vp, url('/expenses'));
    const controls: string[] = [];
    for (const sel of [SEL.addLink, SEL.editLinks, SEL.deleteButtons]) {
      if ((await vp.page.locator(sel).count()) > 0) controls.push(sel);
    }
    if (controls.length) {
      const box = await vp.page.locator(controls[0]!).first().boundingBox().catch(() => null);
      await C.add({
        check: 'expense.viewer-no-edit-controls', category: 'permission', route: '/expenses', role: vp.role, step: 'viewer-readonly',
        selector: controls[0]!, ...(box ? { region: { x: box.x, y: box.y, w: box.width, h: box.height, viewport: '1280x720' } } : {}),
        description: `The viewer is offered editing controls: ${controls.join(', ')}`, confidence: 0.85, page: vp.page,
        repro: [`Sign in as ${vp.role}`, 'Open /expenses', 'Look for Add, Edit or Delete controls'],
      });
    }
    const target = editorList?.rows.find((r) => r.editHref) ?? firstList?.rows[0];
    const id = (target?.editHref ? /\/expenses\/(\d+)\/edit/.exec(target.editHref)?.[1] : undefined) ?? '1';
    const leaks: string[] = [];
    let leakRoute: string | undefined;
    // GET the edit form directly.
    vp.monitor.paused = true;
    const response = await ctx.goto(vp, url(`/expenses/${id}/edit`));
    const status = response?.status() ?? 0;
    const getRefused = normaliseRoute(vp.page.url()) === '/login' || refused(status, undefined) || (await vp.page.locator(`form[action="/expenses/${id}"]`).count()) === 0;
    if (!getRefused) { leaks.push(`GET /expenses/${id}/edit returned ${status} with the edit form`); leakRoute = `/expenses/${id}/edit`; }
    // POST an update with the row's current values (a no-op if it is wrongly accepted).
    const form = target ? { title: target.title, category: target.category, amount: (toCents(target.amount ?? 0) / 100).toFixed(2) } : { title: 'x', category: 'travel', amount: '1.00' };
    const post = await vp.context.request.post(url(`/expenses/${id}`), { form, maxRedirects: 0, failOnStatusCode: false });
    const postLocation = post.headers()['location'];
    if (!refused(post.status(), postLocation)) {
      leaks.push(`POST /expenses/${id} returned ${post.status()}${postLocation ? ` -> ${postLocation}` : ''}`);
      leakRoute ??= `/expenses/${id}`;
    }
    vp.monitor.paused = false;
    if (leaks.length && leakRoute) {
      await C.add({
        check: 'expense.viewer-endpoints-refused', category: 'permission', route: leakRoute, role: vp.role, step: 'viewer-readonly',
        description: `The viewer can reach editor-only endpoints: ${leaks.join('; ')} (expected 403)`,
        evidence: [{ kind: 'network', excerpt: leaks.join('\n') }], confidence: 0.9,
        ...(leakRoute.endsWith('/edit') ? { page: vp.page } : {}),
        repro: [`Sign in as ${vp.role}`, `Open /expenses/${id}/edit directly`, `Or POST /expenses/${id} with title, category and amount`],
      });
    }
  });

  // 5. Add an expense (editor journey): success message, exactly one new row straight away, persists.
  if (editorIn && ep) await ctx.step('expense.add', async () => {
    await ctx.goto(ep, url('/expenses'));
    const before = await readList(ep.page);
    const count = (v: ListView): number => v.rows.filter((r) => r.title === NEW_TITLE).length;
    const already = count(before);
    const link = ep.page.locator(SEL.addLink);
    if ((await link.count()) === 0) {
      await C.add({
        check: 'expense.editor-add-control', category: 'functional', route: '/expenses', role: ep.role, step: 'add', selector: SEL.addLink,
        description: 'The editor is offered no way to add an expense', confidence: 0.7, page: ep.page,
      });
      return;
    }
    const linkText = ((await link.first().textContent()) ?? '').trim();
    if (linkText !== addLabel) {
      // Copy assertion from the journey ("Choose \"Add expense\""). Deliberately as brittle as a real suite.
      await C.add({
        check: 'expense.add-control-label', category: 'copy', route: '/expenses', role: ep.role, step: 'add', selector: SEL.addLink,
        description: `The add control reads "${linkText}"; the journey calls it "${addLabel}"`, confidence: 0.5, page: ep.page,
      });
    }
    await submit(ep.page, SEL.addLink);
    await scan(ep, 'add');
    await ep.page.fill(SEL.title, NEW_TITLE);
    await ep.page.selectOption(SEL.category, NEW_CATEGORY);
    await ep.page.fill(SEL.amount, NEW_AMOUNT);
    await submit(ep.page, 'form[method="post"] button[type="submit"]');
    if (normaliseRoute(ep.page.url()) !== '/expenses') {
      await C.add({
        check: 'expense.add-saves', category: 'functional', route: ep.page.url(), role: ep.role, step: 'add',
        description: `Saving a valid new expense does not return to the list (still on ${normaliseRoute(ep.page.url())})`,
        confidence: 0.8, page: ep.page,
      });
      return;
    }
    const after = await readList(ep.page);
    await checkTotal(ep, after, 'add');
    await checkFlash(ctx, ep, after.flash, 'Expense saved', 'add');
    const repro = [`Sign in as ${ep.role}`, 'Open /expenses and note the rows', `Choose "${addLabel}"`, `Save title "${NEW_TITLE}", category ${NEW_CATEGORY}, amount ${NEW_AMOUNT}`, 'Count the rows with that title'];
    const n = count(after) - already;
    if (n > 1) {
      await C.add({
        check: 'expense.add-one-row', category: 'functional', route: '/expenses', role: ep.role, step: 'add', selector: SEL.table,
        description: `Saving one new expense added ${n} rows to the list`, confidence: 0.9, page: ep.page, repro,
        evidence: [{ kind: 'dom', excerpt: after.rows.map((r) => `${r.title} | ${r.category} | ${r.amountText}`).join('\n') }],
      });
      return;
    }
    await ctx.goto(ep, url('/expenses'));
    const reloaded = await readList(ep.page);
    const n2 = count(reloaded) - already;
    if (n === 1 && n2 === 1) return;
    if (n === 0 && n2 === 1) {
      await C.add({
        check: 'expense.add-shows-now', category: 'consistency', route: '/expenses', role: ep.role, step: 'add', selector: SEL.table,
        description: 'A new expense is missing from the list straight after saving; it only appears after a reload', confidence: 0.8, page: ep.page, repro,
      });
      return;
    }
    if (n === 1 && n2 === 0) {
      await C.add({
        check: 'expense.add-persists', category: 'functional', route: '/expenses', role: ep.role, step: 'add', selector: SEL.table,
        description: 'A new expense shows after saving but is gone after a reload', confidence: 0.85, page: ep.page, repro,
      });
      return;
    }
    if (n2 > 1) {
      await C.add({
        check: 'expense.add-one-row', category: 'functional', route: '/expenses', role: ep.role, step: 'add', selector: SEL.table,
        description: `Saving one new expense left ${n2} rows with its title after a reload`, confidence: 0.85, page: ep.page, repro,
      });
      return;
    }
    // Missing straight away and after a reload: is it saved at all? Ask a view that was not loaded before.
    await ctx.goto(ep, url(`/expenses?category=${NEW_CATEGORY}`));
    const filtered = await readList(ep.page);
    if (count(filtered) > 0) {
      await C.add({
        check: 'expense.add-shows-now', category: 'consistency', route: '/expenses', role: ep.role, step: 'add', selector: SEL.table,
        description: `A saved expense is missing from the full list, even after a reload, but shows when filtering by "${NEW_CATEGORY}": the list is stale`,
        confidence: 0.8, page: ep.page, repro: [...repro, 'Reload', `Filter by ${NEW_CATEGORY}`],
      });
    } else {
      await C.add({
        check: 'expense.add-persists', category: 'functional', route: '/expenses', role: ep.role, step: 'add', selector: SEL.table,
        description: `After "${after.flash ?? 'no message'}" the new expense is in no list view, not even after a reload: it was not saved`,
        confidence: 0.85, page: ep.page, repro: [...repro, 'Reload', `Filter by ${NEW_CATEGORY}`],
      });
    }
  });

  // 6. Edit an expense (editor journey): message matches, list and total update straight away, persists.
  if (editorIn && ep) await ctx.step('expense.edit', async () => {
    await ctx.goto(ep, url('/expenses'));
    const before = await readList(ep.page);
    const row = before.rows.find((r) => r.editHref && r.title !== NEW_TITLE && r.amount !== undefined);
    if (!row?.editHref || row.amount === undefined) {
      C.note('expense.edit: no editable row found');
      return;
    }
    const href = row.editHref;
    const editRoute = normaliseRoute(href);
    await submit(ep.page, `a[href="${href}"]`);
    await scan(ep, 'edit');
    const shown = {
      title: await ep.page.inputValue(SEL.title), category: await ep.page.inputValue(SEL.category), amount: await ep.page.inputValue(SEL.amount),
    };
    const mismatch = [
      shown.title !== row.title ? `title "${shown.title}" vs "${row.title}"` : '',
      shown.category !== row.category ? `category "${shown.category}" vs "${row.category}"` : '',
      parseMoney(shown.amount) === undefined || toCents(parseMoney(shown.amount)!) !== toCents(row.amount) ? `amount "${shown.amount}" vs "${row.amountText}"` : '',
    ].filter(Boolean);
    if (mismatch.length) {
      await C.add({
        check: 'expense.edit-prefill', category: 'consistency', route: editRoute, role: ep.role, step: 'edit', selector: 'form[method="post"]',
        description: `The edit form does not show the expense as listed: ${mismatch.join('; ')}`, confidence: 0.7, page: ep.page,
      });
    }
    const newCents = toCents(row.amount) + 100;
    const newAmount = (newCents / 100).toFixed(2);
    await ep.page.fill(SEL.amount, newAmount);
    await submit(ep.page, 'form[method="post"] button[type="submit"]');
    if (normaliseRoute(ep.page.url()) !== '/expenses') {
      await C.add({
        check: 'expense.edit-saves', category: 'functional', route: ep.page.url(), role: ep.role, step: 'edit',
        description: `Saving a valid edit does not return to the list (still on ${normaliseRoute(ep.page.url())})`, confidence: 0.8, page: ep.page,
      });
      return;
    }
    const after = await readList(ep.page);
    await checkTotal(ep, after, 'edit');
    await checkFlash(ctx, ep, after.flash, 'Expense updated', 'edit');
    const repro = [`Sign in as ${ep.role}`, `Open ${href}`, `Change the amount of "${row.title}" from ${row.amountText} to $${newAmount}`, 'Save', 'Read the row and the total'];
    const listed = after.rows.find((r) => r.editHref === href);
    if (listed?.amount !== undefined && toCents(listed.amount) === newCents) {
      await ctx.goto(ep, url('/expenses'));
      const again = (await readList(ep.page)).rows.find((r) => r.editHref === href);
      if (again?.amount === undefined || toCents(again.amount) !== newCents) {
        await C.add({
          check: 'expense.edit-persists', category: 'functional', route: '/expenses', role: ep.role, step: 'edit', selector: SEL.table,
          description: `An edited amount shows after saving but reverts to ${again?.amountText ?? '(row gone)'} after a reload`, confidence: 0.85, page: ep.page, repro,
        });
      }
      return;
    }
    // The list does not show the new amount. Is it saved? The edit form reads the record directly.
    const flash = after.flash;
    const shot = ep.page;
    await ctx.goto(ep, url(href));
    const stored = parseMoney(await ep.page.inputValue(SEL.amount).catch(() => ''));
    if (stored !== undefined && toCents(stored) === newCents) {
      await ctx.goto(ep, url('/expenses'));
      await C.add({
        check: 'expense.edit-shows-now', category: 'consistency', route: '/expenses', role: ep.role, step: 'edit', selector: SEL.table,
        description: `After "${flash ?? 'no message'}" the list still shows ${listed?.amountText ?? '(row missing)'} for "${row.title}" although the record holds $${newAmount}: the list is stale`,
        confidence: 0.8, page: ep.page, repro: [...repro, `Open ${href} again: the form shows the new amount`],
      });
    } else {
      await ctx.goto(ep, url('/expenses'));
      await C.add({
        check: 'expense.edit-message-matches', category: 'functional', route: '/expenses', role: ep.role, step: 'edit', selector: SEL.flash,
        description: `The app says "${flash ?? '(no message)'}" but the change was not saved: "${row.title}" still has ${listed?.amountText ?? '(row missing)'}, not $${newAmount}`,
        confidence: 0.85, page: shot, repro: [...repro, `Open ${href} again: the old amount is still there`],
      });
    }
  });

  // 7. Filter by category (viewer journey).
  if (viewerIn && vp) await ctx.step('expense.filter', async () => {
    await ctx.goto(vp, url('/expenses'));
    const all = await readList(vp.page);
    const options = (await vp.page.$$eval(`${SEL.filter} option`, (os) => os.map((o) => (o as HTMLOptionElement).value))).filter(Boolean);
    for (const value of options) {
      await vp.page.selectOption(SEL.filter, value);
      await submit(vp.page, SEL.apply);
      const view = await readList(vp.page);
      await checkTotal(vp, view, 'filter');
      const others = view.rows.filter((r) => r.category !== value);
      const expected = all.rows.filter((r) => r.category === value).length;
      const wrong = others.length
        ? `"${value}" also lists ${others.length} row(s) of other categories (${[...new Set(others.map((r) => r.category))].join(', ')})`
        : view.rows.length === 0 && expected > 0 ? `"${value}" lists nothing although ${expected} row(s) have that category` : undefined;
      if (wrong) {
        // One report for the filter (the collector keeps the first failing option).
        await C.add({
          check: 'expense.filter-only-chosen', category: 'functional', route: '/expenses', role: vp.role, step: 'filter', selector: SEL.table,
          description: `The category filter does not filter: ${wrong}`, confidence: 0.9, page: vp.page,
          evidence: [{ kind: 'dom', excerpt: view.rows.map((r) => `${r.title} | ${r.category} | ${r.amountText}`).join('\n') }],
          repro: [`Sign in as ${vp.role}`, 'Open /expenses', `Choose category "${value}" and Apply`, 'Look at the Category column'],
        });
      }
    }
  });

  // 8. Sign out ends the session.
  if (viewerIn && vp) await ctx.step('expense.sign-out', async () => {
    await ctx.goto(vp, url('/expenses'));
    await submit(vp.page, SEL.signOut);
    await ctx.goto(vp, url('/expenses'));
    if (normaliseRoute(vp.page.url()) !== '/login') {
      await C.add({
        check: 'expense.sign-out', category: 'permission', route: '/expenses', role: vp.role, step: 'sign-out',
        description: 'After signing out, /expenses is still shown', confidence: 0.8, page: vp.page,
      });
    }
  });

  await vp?.context.close();
  await ep?.context.close();
}

/** Click something that loads a new document (link, form submit) and wait for that document. */
async function submit(page: Page, selector: string): Promise<void> {
  const loaded = page.waitForEvent('load', { timeout: 15_000 });
  await page.click(selector);
  await loaded;
}

async function checkFlash(ctx: SuiteContext, mp: MonitoredPage, flash: string | undefined, expected: string, step: string): Promise<void> {
  if (flash === expected) return;
  await ctx.collector.add({
    check: `expense.${step}-message`, category: flash ? 'copy' : 'functional', route: '/expenses', ...(mp.role ? { role: mp.role } : {}), step, selector: SEL.flash,
    description: flash ? `After saving, the message reads "${flash}", expected "${expected}"` : `After saving, no success message is shown (expected "${expected}")`,
    confidence: flash ? 0.5 : 0.6, page: mp.page,
  });
}
