// Mutation validation for the expense app (BRIEF.md §8.3): for every label, the labelled symptom appears with its
// switch on, and the clean build does not show it. Several defects can be on at once (DEFECT=a,b,c), so it also runs
// multi-defect combinations: every member's symptom must show in one container. Native script (needs docker), not a
// CI test:
//   npx tsx apps/expense-app/verify.ts [--image <tag>]
// Builds the image unless --image is given. Plain HTTP: the app is server-rendered, so no browser is needed.
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const argImage = process.argv.indexOf('--image');
const image = argImage > 0 ? process.argv[argImage + 1]! : 'qa-bench-app-expense-app:verify';
if (argImage < 0) execFileSync('docker', ['build', '-q', '-t', image, here], { stdio: 'inherit' });

const VIEWER = { username: 'viewer-verify', password: 'verify-viewer-pw' };
const EDITOR = { username: 'editor-verify', password: 'verify-editor-pw' };

interface Row { title: string; category: string; cents: number }
interface App { base: string; stop(): void }

function start(env: Record<string, string>): App {
  const args = ['run', '-d', '--rm', '-p', '127.0.0.1::3000',
    '-e', `QA_BENCH_VIEWER_ACCOUNTS=${VIEWER.username}:${VIEWER.password}`,
    '-e', `QA_BENCH_EDITOR_ACCOUNTS=${EDITOR.username}:${EDITOR.password}`];
  for (const [k, v] of Object.entries(env)) args.push('-e', `${k}=${v}`);
  const id = execFileSync('docker', [...args, image], { encoding: 'utf8' }).trim();
  const port = execFileSync('docker', ['port', id, '3000/tcp'], { encoding: 'utf8' }).trim().split('\n')[0]!.split(':').pop();
  return { base: `http://127.0.0.1:${port}`, stop: () => { execFileSync('docker', ['rm', '-f', id], { stdio: 'ignore' }); } };
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
  return [...body.matchAll(/<tr><td>(.*?)<\/td><td>([a-z]+)<\/td><td>\$([\d.]+)<\/td>/g)].map((m) => ({
    title: m[1]!, category: m[2]!, cents: Math.round(Number(m[3]) * 100),
  }));
}
function total(html: string): number {
  const m = html.match(/data-testid="total">Total: \$([\d.]+)/);
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

// Each probe returns true when its symptom is present. Probes touch different rows, so the members of a
// combination can run one after another in the same container.
const probes: Record<string, (app: App) => Promise<boolean>> = {
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
  'expense.relabel': async (app) => {
    const c = await login(app, EDITOR);
    const list = (await get(app, c, '/expenses')).html;
    const form = (await get(app, c, '/expenses/new')).html;
    return list.includes('New expense') && form.includes('Save expense') && form.includes('Expense title');
  },
};

// Natural defects: real bugs present on every build, so they must show on the clean build.
const naturalProbes: Record<string, (app: App) => Promise<boolean>> = {
  'expense.huge-amount-breaks-list': async (app) => {
    const c = await login(app, EDITOR);
    const saved = await post(app, c, '/expenses', { title: 'Huge', category: 'office', amount: '99999999999999' });
    return saved.status === 303 && (await get(app, c, '/expenses')).status === 500;
  },
  'expense.rejected-form-loses-input': async (app) => {
    const c = await login(app, EDITOR);
    const res = await fetch(app.base + '/expenses', { method: 'POST', headers: { cookie: c }, redirect: 'manual', body: new URLSearchParams({ title: '   ', category: 'office', amount: '5.00' }) });
    const html = await res.text();
    return res.status === 400 && !/role="alert"/.test(html) && !html.includes('value="5.00"');
  },
};

const switches: Record<string, Record<string, string>> = {
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
};

// Multi-defect episodes: every member's symptom shows in one container, probed one after another. No two members
// share an exclusive group (expense-create, expense-update, expense-filter).
const combinations: string[][] = [
  ['expense.wrong-total', 'expense.edit-drops-cents', 'expense.title-not-escaped'],
  ['expense.total-under-filter', 'expense.delete-open-to-viewer', 'expense.long-title-truncated'],
  ['expense.permission-bypass', 'expense.edit-resets-category', 'expense.duplicate-write'],
  ['expense.stale-state', 'expense.ignored-filter', 'expense.permission-bypass'],
  ['expense.missing-persistence', 'expense.misleading-success', 'expense.wrong-total'],
  ['expense.wrong-total', 'expense.total-under-filter', 'expense.edit-resets-category'],
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
  const env = { DEFECT: members.map((id) => switches[id]!.DEFECT).join(',') };
  const app = start(env);
  try {
    await waitUp(app);
    const missing: string[] = [];
    for (const id of members) if (!(await probes[id]!(app))) missing.push(id);
    console.log(`${missing.length ? 'FAIL' : 'ok  '} DEFECT=${env.DEFECT} shows all ${members.length}${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
    if (missing.length) failures++;
  } finally { app.stop(); }
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

console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
