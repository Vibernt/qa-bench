// Label validation for the-internet (BRIEF.md §8.3), noise only. Baseline labels describe pages broken on purpose,
// so every found_by symptom must show on the clean build. The deliberate change must show with its switch on and not
// on the clean build. Every page in app.yaml must load.
// Native script (needs docker and Playwright's Chromium), not a CI test:
//   npx tsx apps/the-internet/verify.ts [--image <tag>]
// Builds the image unless --image is given. One check per found_by entry, in label order.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { chromium, type Browser, type Page } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const argImage = process.argv.indexOf('--image');
const image = argImage > 0 ? process.argv[argImage + 1]! : 'qa-bench-app-the-internet:verify';
if (argImage < 0) {
  const secret = process.env.QA_BENCH_EXTRA_CA ? ['--secret', `id=extra_ca,src=${process.env.QA_BENCH_EXTRA_CA}`] : [];
  execFileSync('docker', ['build', '-q', ...secret, '-t', image, here], { stdio: 'inherit' });
}

interface App { base: string; stop(): void }
function start(env: Record<string, string>): App {
  const args = ['run', '-d', '--rm', '-p', '127.0.0.1::5000'];
  for (const [k, v] of Object.entries(env)) args.push('-e', `${k}=${v}`);
  const id = execFileSync('docker', [...args, image], { encoding: 'utf8' }).trim();
  const port = execFileSync('docker', ['port', id, '5000/tcp'], { encoding: 'utf8' }).trim().split('\n')[0]!.split(':').pop();
  return { base: `http://127.0.0.1:${port}`, stop: () => { execFileSync('docker', ['rm', '-f', id], { stdio: 'ignore' }); } };
}
async function waitUp(app: App): Promise<void> {
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(app.base + '/')).ok) return; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('app did not start');
}

interface S { page: Page; base: string; errors: string[]; requests: string[] }
type Check = (s: S) => Promise<boolean>;
const browser: Browser = await chromium.launch();
async function session<T>(base: string, fn: (s: S) => Promise<T>): Promise<T> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const s: S = { page, base, errors: [], requests: [] };
  page.on('pageerror', (e) => s.errors.push(e.message));
  page.on('request', (r) => s.requests.push(r.url()));
  page.on('dialog', (d) => void d.dismiss());
  page.setDefaultTimeout(10000);
  try { return await fn(s); } finally { await context.close(); }
}
const go = async (s: S, path: string) => (await s.page.goto(s.base + path, { waitUntil: 'load' }))?.status() ?? 0;
const status = async (base: string, path: string) => (await fetch(base + path, { redirect: 'manual' })).status;
/** True when `probe` returns each of the wanted values within `tries` fresh loads (random pages). */
async function seenAll<T>(tries: number, wanted: T[], probe: () => Promise<T>): Promise<boolean> {
  const seen = new Set<T>();
  for (let i = 0; i < tries && seen.size < wanted.length; i++) {
    const v = await probe();
    if (wanted.includes(v)) seen.add(v);
  }
  return seen.size === wanted.length;
}
async function imageBroken(s: S, src: string): Promise<boolean> {
  await go(s, '/broken_images');
  return s.page.locator(`img[src="${src}"]`).evaluate((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth === 0);
}
async function notFound(s: S, path: string): Promise<boolean> {
  const code = await go(s, path);
  return code === 404 && (await s.page.locator('h1').first().innerText()).includes('Not Found');
}
async function deadAnchor(s: S, path: string, href: string): Promise<boolean> {
  await go(s, path);
  const before = await s.page.locator('#content').innerText();
  await s.page.locator(`a[href="${href}"]`).first().click();
  await s.page.waitForTimeout(200);
  return s.page.url().endsWith(path + href) && (await s.page.locator('#content').innerText()) === before;
}
const typoProbe = (base: string) => () => session(base, async (s) => {
  await go(s, '/typos');
  return (await s.page.locator('.example').innerText()).includes("won,t") ? 'typo' : 'clean';
});
const galleryProbe = (base: string) => () => session(base, async (s) => {
  await go(s, '/disappearing_elements');
  return (await s.page.locator('a[href="/gallery/"]').count()) > 0 ? 'shown' : 'hidden';
});
const flashProbe = (base: string) => () => session(base, async (s) => {
  await go(s, '/notification_message');
  return (await s.page.locator('#flash').innerText()).includes('unsuccesful') ? 'fail' : 'ok';
});
const listProbe = (base: string) => () => session(base, async (s) => {
  await go(s, '/shifting_content/list');
  return (await s.page.locator('.example .large-6').first().innerText()).split('\n')[0]!.trim();
});

const checks: Record<string, Check[]> = {
  'internet.broken-images': [
    (s) => imageBroken(s, 'asdf.jpg'),
    (s) => imageBroken(s, 'hjkl.jpg'),
    async (s) => (await status(s.base, '/asdf.jpg')) === 404 && (await status(s.base, '/hjkl.jpg')) === 404,
    async (s) => (await imageBroken(s, 'asdf.jpg')) && !(await imageBroken(s, 'img/avatar-blank.jpg')),
  ],
  'internet.javascript-error': [
    async (s) => { await go(s, '/javascript_error'); return s.errors.some((e) => e.includes("reading 'xyz'")); },
    async (s) => { await go(s, '/javascript_error'); return s.errors.length > 0; },
  ],
  'internet.status-codes': [
    async (s) => (await status(s.base, '/status_codes/404')) === 404 && (await status(s.base, '/status_codes/500')) === 500,
    async (s) => {
      await go(s, '/status_codes');
      const [res] = await Promise.all([s.page.waitForResponse((r) => r.url().endsWith('/status_codes/500')), s.page.click('a[href="status_codes/500"]')]);
      return res.status() === 500;
    },
  ],
  'internet.typos': [
    async (s) => seenAll(30, ['typo'], typoProbe(s.base)),
    async (s) => seenAll(30, ['typo', 'clean'], typoProbe(s.base)),
  ],
  'internet.disappearing-elements': [
    async (s) => seenAll(30, ['hidden'], galleryProbe(s.base)),
    async (s) => seenAll(30, ['hidden', 'shown'], galleryProbe(s.base)),
    async (s) => { await go(s, '/disappearing_elements'); await s.page.click('a[href="/about/"]'); return (await s.page.locator('h1').innerText()).includes('Not Found'); },
    async (s) => (await status(s.base, '/about/')) === 404,
    ...['/about/', '/contact-us/', '/portfolio/', '/gallery/'].map((p) => (s: S) => notFound(s, p)),
    ...['/about/', '/contact-us/', '/portfolio/', '/gallery/'].map((p) => async (s: S) => (await status(s.base, p)) === 404),
  ],
  'internet.shifting-content': [
    async (s) => {
      const left = async () => { await go(s, '/shifting_content/menu'); return (await s.page.locator('a[href="/gallery/"]').boundingBox())?.x ?? 0; };
      const a = await left();
      const b = await left();
      return Math.abs(a - b) >= 20;
    },
    async (s) => {
      const firsts = new Set<string>();
      for (let i = 0; i < 15 && firsts.size < 2; i++) firsts.add(await listProbe(s.base)());
      return firsts.size >= 2;
    },
  ],
  'internet.placeholder-links': [
    async (s) => { await go(s, '/hovers'); return (await s.page.locator('a[href="/users/1"]').count()) === 1 && (await status(s.base, '/users/1')) === 404; },
    (s) => notFound(s, '/users/2'),
    async (s) => (await status(s.base, '/users/3')) === 404,
    (s) => deadAnchor(s, '/tables', '#edit'),
    (s) => deadAnchor(s, '/tables', '#delete'),
    (s) => deadAnchor(s, '/challenging_dom', '#edit'),
    (s) => deadAnchor(s, '/challenging_dom', '#delete'),
  ],
  'internet.notification-message': [
    async (s) => seenAll(30, ['fail'], flashProbe(s.base)),
    async (s) => seenAll(30, ['fail'], flashProbe(s.base)),
    async (s) => seenAll(30, ['fail', 'ok'], flashProbe(s.base)),
  ],
  'internet.slow-resource': [
    async (s) => { const t0 = Date.now(); await status(s.base, '/slow_external'); return Date.now() - t0 >= 25000; },
    async (s) => {
      let done = false;
      s.page.on('requestfinished', (r) => { if (r.url().endsWith('/slow_external')) done = true; });
      await go(s, '/slow');
      await s.page.waitForTimeout(3000);
      return s.requests.some((u) => u.endsWith('/slow_external')) && !done;
    },
  ],
  'internet.third-party-requests': [
    async (s) => { await go(s, '/'); await s.page.waitForTimeout(500); return s.requests.some((u) => new URL(u).hostname.endsWith('log.optimizely.com')); },
    async (s) => { await go(s, '/dynamic_controls'); return s.requests.some((u) => u.startsWith('https://ajax.googleapis.com/ajax/libs/jquery/')); },
  ],
  'internet.welcome-heading': [
    async (s) => { await go(s, '/'); return (await s.page.locator('h1.heading').innerText()) === 'Welcome to The Internet practice site'; },
    async (s) => { await go(s, '/'); return (await s.page.getByText('Welcome to the-internet', { exact: true }).count()) === 0; },
    async (s) => { await go(s, '/'); return (await s.page.locator('h1.heading').innerText()) !== 'Welcome to the-internet'; },
  ],
};

function labels(kind: string): { id: string; entries: number; env: Record<string, string> }[] {
  return readdirSync(join(here, kind)).map((dir) => {
    const l = YAML.parse(readFileSync(join(here, kind, dir, 'label.yaml'), 'utf8'));
    return { id: l.id as string, entries: (l.found_by as unknown[]).length, env: (l.switch?.env ?? {}) as Record<string, string> };
  });
}

let failures = 0;
const report = (ok: boolean, msg: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) failures++; };
async function runChecks(base: string, id: string, expect: boolean): Promise<void> {
  const list = checks[id]!;
  for (let i = 0; i < list.length; i++) {
    let present: boolean | string;
    try { present = await session(base, list[i]!); } catch (e) { present = `error: ${(e as Error).message.split('\n')[0]}`; }
    report(present === expect, `${id}[${i}] ${expect ? 'shows' : 'absent on clean build'}${present === expect ? '' : ` (got ${present})`}`);
  }
}
const countOk = (l: { id: string; entries: number }) => {
  const ok = checks[l.id]?.length === l.entries;
  if (!ok) report(false, `${l.id}: ${l.entries} found_by entries but ${checks[l.id]?.length ?? 0} checks`);
  return ok;
};

const clean = start({});
try {
  await waitUp(clean);
  const app = YAML.parse(readFileSync(join(here, 'app.yaml'), 'utf8')) as { pages: string[] };
  const bad: string[] = [];
  for (const p of app.pages) { const code = await status(clean.base, p); if (code !== 200) bad.push(`${p} ${code}`); }
  report(bad.length === 0, `clean build: all ${app.pages.length} app.yaml pages answer 200${bad.length ? ': ' + bad.join(', ') : ''}`);

  for (const l of labels('baseline')) if (countOk(l)) await runChecks(clean.base, l.id, true);
  for (const l of labels('changes')) {
    if (!countOk(l)) continue;
    await runChecks(clean.base, l.id, false);
    const changed = start(l.env);
    try { await waitUp(changed); await runChecks(changed.base, l.id, true); } finally { changed.stop(); }
  }
} finally {
  clean.stop();
  await browser.close();
}

console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
