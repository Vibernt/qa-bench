// Mutation validation for the expense app (BRIEF.md §8.3): for every label, the labelled symptom appears with its
// switch on, and the clean build does not show it. Native script (needs docker), not a CI test:
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
  return [...body.matchAll(/<tr><td>(.*?)<\/td><td>(.*?)<\/td><td>\$([\d.]+)<\/td>/g)].map((m) => ({
    title: m[1]!, category: m[2]!, cents: Math.round(Number(m[3]) * 100),
  }));
}
function total(html: string): number {
  const m = html.match(/data-testid="total">Total: \$([\d.]+)/);
  if (!m) throw new Error('no total');
  return Math.round(Number(m[1]) * 100);
}

// Each probe returns true when its symptom is present.
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
    const saved = await post(app, c, '/expenses/1', { title: 'Train to Pune', category: 'travel', amount: '99.00' });
    const row = rows((await get(app, c, '/expenses')).html).find((r) => r.title === 'Train to Pune');
    return saved.location.includes('flash=updated') && row?.cents !== 9900;
  },
  'expense.relabel': async (app) => {
    const c = await login(app, EDITOR);
    const list = (await get(app, c, '/expenses')).html;
    const form = (await get(app, c, '/expenses/new')).html;
    return list.includes('New expense') && form.includes('Save expense') && form.includes('Expense title');
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
  'expense.relabel': { VARIANT: 'relabel' },
};

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
