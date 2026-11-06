// Mutation validation for Swag Labs (BRIEF.md §8.3): for every label, each found_by symptom appears with its switch
// on, and the clean build does not show it. Also: the clean build completes a full checkout with a generated account,
// built-in usernames are refused in bench mode, and every deliberate change keeps checkout correct.
// Native script (needs docker and Playwright's Chromium), not a CI test:
//   npx tsx apps/swag-labs/verify.ts [--image <tag>] [--only <label-id>]
// Builds the image unless --image is given. There is one check per found_by entry, in the same order; the script
// fails if a label's found_by count and its checks disagree.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { chromium, type Browser, type Page } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const image = arg('--image') ?? 'qa-bench-app-swag-labs:verify';
const only = arg('--only');
if (!arg('--image')) {
  const secret = process.env.QA_BENCH_EXTRA_CA ? ['--secret', `id=extra_ca,src=${process.env.QA_BENCH_EXTRA_CA}`] : [];
  execFileSync('docker', ['build', '-q', ...secret, '-t', image, here], { stdio: 'inherit' });
}

const ACCOUNT = { username: 'customer-verify', password: 'verify-customer-pw' };

interface App { base: string; stop(): void }
function start(env: Record<string, string>): App {
  const args = ['run', '-d', '--rm', '-p', '127.0.0.1::80', '-e', `QA_BENCH_ACCOUNTS=${ACCOUNT.username}:${ACCOUNT.password}`];
  for (const [k, v] of Object.entries(env)) args.push('-e', `${k}=${v}`);
  const id = execFileSync('docker', [...args, image], { encoding: 'utf8' }).trim();
  const port = execFileSync('docker', ['port', id, '80/tcp'], { encoding: 'utf8' }).trim().split('\n')[0]!.split(':').pop();
  return { base: `http://127.0.0.1:${port}`, stop: () => { execFileSync('docker', ['rm', '-f', id], { stdio: 'ignore' }); } };
}
async function waitUp(app: App): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(app.base + '/runtime-config.js')).ok) return; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('app did not start');
}

// ---- browser helpers -------------------------------------------------------------------------------------------
interface S { page: Page; base: string; errors: string[]; consoleErrors: string[]; dialogs: string[] }
type Check = (s: S) => Promise<boolean>;
const browser: Browser = await chromium.launch();

async function session<T>(base: string, fn: (s: S) => Promise<T>): Promise<T> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const s: S = { page, base, errors: [], consoleErrors: [], dialogs: [] };
  page.on('pageerror', (e) => s.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') s.consoleErrors.push(m.text()); });
  page.on('dialog', (d) => { s.dialogs.push(d.message()); void d.dismiss(); });
  page.setDefaultTimeout(8000);
  try { return await fn(s); } finally { await context.close(); }
}
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const dt = (id: string) => `[data-test="${id}"]`;

/** Sign in with the generated account. Resolves once the product list or a login error is shown. */
async function login(s: S, who = ACCOUNT): Promise<void> {
  await s.page.goto(s.base + '/');
  await s.page.fill(dt('username'), who.username);
  await s.page.fill(dt('password'), who.password);
  await s.page.click(dt('login-button'));
  await s.page.locator(`${dt('inventory-list')}, ${dt('error')}`).first().waitFor({ timeout: 15000 });
}
async function open(s: S, path: string): Promise<void> {
  await s.page.goto(s.base + path);
  await s.page.locator('#root > *').first().waitFor({ timeout: 15000 });
}
const text = async (s: S, sel: string) => (await s.page.locator(sel).first().innerText()).trim();
const count = (s: S, sel: string) => s.page.locator(sel).count();
const money = (t: string) => Number(t.replace(/[^0-9.]/g, ''));

async function addDoesNothing(s: S, slug: string): Promise<boolean> {
  await login(s);
  await s.page.click(dt(`add-to-cart-${slug}`));
  await pause(300);
  return (await count(s, dt(`remove-${slug}`))) === 0;
}
async function removeDoesNothing(s: S, slug: string): Promise<boolean> {
  await login(s);
  await s.page.click(dt(`add-to-cart-${slug}`));
  await s.page.locator(dt(`remove-${slug}`)).waitFor();
  await s.page.click(dt(`remove-${slug}`));
  await pause(300);
  return (await count(s, dt(`remove-${slug}`))) === 1;
}
async function sortIgnored(s: S): Promise<boolean> {
  await login(s);
  await s.page.selectOption(dt('product-sort-container'), 'za');
  await pause(300);
  return (await text(s, dt('inventory-item-name'))) !== 'Test.allTheThings() T-Shirt (Red)';
}
async function detailNameAfterClick(s: S, linkId: string): Promise<string> {
  await login(s);
  await s.page.click(dt(linkId));
  await s.page.waitForURL('**/inventory-item.html*');
  return text(s, `.inventory_details ${dt('inventory-item-name')}`);
}
async function stepOne(s: S): Promise<void> {
  await login(s);
  await open(s, '/checkout-step-one.html');
}
/** Add the given products, then walk cart → step one → overview. */
async function toOverview(s: S, slugs: string[]): Promise<void> {
  await login(s);
  for (const slug of slugs) await s.page.click(dt(`add-to-cart-${slug}`));
  await s.page.click(dt('shopping-cart-link'));
  await s.page.click(dt('checkout'));
  await s.page.fill(dt('firstName'), 'Ada');
  await s.page.fill(dt('lastName'), 'Lovelace');
  await s.page.fill(dt('postalCode'), 'N1 9GU');
  await s.page.click(dt('continue'));
  await s.page.locator(dt('checkout-summary-container')).waitFor();
}
interface Totals { prices: number[]; subtotal: number; tax: number; total: number }
async function overviewTotals(s: S): Promise<Totals> {
  const prices = (await s.page.locator(`${dt('cart-list')} ${dt('inventory-item-price')}`).allInnerTexts()).map(money);
  return {
    prices,
    subtotal: money(await text(s, dt('subtotal-label'))),
    tax: money(await text(s, dt('tax-label'))),
    total: money(await text(s, dt('total-label'))),
  };
}
const consistent = (t: Totals) => {
  const sum = Math.round(t.prices.reduce((a, b) => a + b, 0) * 100);
  const tax = Math.round(sum * 0.08);
  return Math.round(t.subtotal * 100) === sum && Math.abs(Math.round(t.tax * 100) - tax) <= 1 && Math.round(t.total * 100) === sum + Math.round(t.tax * 100);
};
async function finishOrder(s: S): Promise<void> {
  await s.page.click(dt('finish'));
  await s.page.locator(dt('checkout-complete-container')).waitFor();
}
async function cartLinkBox(s: S): Promise<{ x: number; y: number }> {
  const b = await s.page.locator(dt('shopping-cart-link')).boundingBox();
  return { x: b?.x ?? 0, y: b?.y ?? 0 };
}
const displaced = (b: { x: number; y: number }) => Math.abs(b.x - 1220) > 20 || Math.abs(b.y - 10) > 20;
async function msToProducts(s: S, act: () => Promise<unknown>): Promise<number> {
  const t0 = Date.now();
  await act();
  await s.page.locator(dt('inventory-list')).waitFor({ timeout: 20000 });
  return Date.now() - t0;
}

const ODD = ['sauce-labs-bolt-t-shirt', 'sauce-labs-fleece-jacket', 'test.allthethings()-t-shirt-(red)'];
const EVEN = ['sauce-labs-backpack', 'sauce-labs-bike-light', 'sauce-labs-onesie'];
let cleanListTop = 0;

// ---- one check per found_by entry, in label order ---------------------------------------------------------------
const checks: Record<string, Check[]> = {
  'swag.problem-user': [
    async (s) => {
      await login(s);
      const srcs = await s.page.locator(`${dt('inventory-list')} img.inventory_item_img`).evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src));
      return srcs.length === 6 && new Set(srcs).size === 1;
    },
    ...ODD.map((slug) => (s: S) => addDoesNothing(s, slug)),
    ...EVEN.map((slug) => (s: S) => removeDoesNothing(s, slug)),
    sortIgnored,
    async (s) => (await detailNameAfterClick(s, 'item-4-title-link')) !== 'Sauce Labs Backpack',
    async (s) => (await detailNameAfterClick(s, 'item-5-title-link')) === 'ITEM NOT FOUND',
    async (s) => {
      await login(s);
      await open(s, '/inventory-item.html?id=1');
      await s.page.click(dt('add-to-cart'));
      await pause(300);
      return (await count(s, dt('remove'))) === 0;
    },
    async (s) => {
      await login(s);
      await s.page.click(dt('add-to-cart-sauce-labs-bike-light'));
      await s.page.click(dt('shopping-cart-link'));
      await s.page.click(dt('item-0-title-link'));
      await s.page.waitForURL('**/inventory-item.html*');
      return (await text(s, `.inventory_details ${dt('inventory-item-name')}`)) !== 'Sauce Labs Bike Light';
    },
    async (s) => {
      await stepOne(s);
      await s.page.fill(dt('firstName'), 'Ada');
      await s.page.fill(dt('lastName'), 'Lovelace');
      return (await s.page.inputValue(dt('lastName'))) === '' && (await s.page.inputValue(dt('firstName'))) !== 'Ada';
    },
    async (s) => {
      await stepOne(s);
      await s.page.fill(dt('firstName'), 'Ada');
      await s.page.fill(dt('lastName'), 'Lovelace');
      await s.page.fill(dt('postalCode'), 'N1 9GU');
      await s.page.click(dt('continue'));
      await pause(300);
      return (await count(s, dt('error'))) > 0 && (await text(s, dt('error'))).includes('Last Name is required');
    },
    async (s) => {
      await login(s);
      await s.page.click(dt('add-to-cart-sauce-labs-backpack'));
      await open(s, '/checkout-step-two.html');
      const t = await overviewTotals(s);
      return Math.round(t.subtotal * 100) !== Math.round(t.prices.reduce((a, b) => a + b, 0) * 100);
    },
    async (s) => {
      await login(s);
      await s.page.click(dt('add-to-cart-sauce-labs-backpack'));
      await open(s, '/checkout-step-two.html');
      const t = await overviewTotals(s);
      const sum = t.prices.reduce((a, b) => a + b, 0);
      return Math.round(t.total * 100) !== Math.round(sum * 100) + Math.round(sum * 8);
    },
    async (s) => {
      await login(s);
      await s.page.click(dt('add-to-cart-sauce-labs-backpack'));
      await open(s, '/checkout-step-two.html');
      await finishOrder(s);
      return (await count(s, dt('shopping-cart-badge'))) > 0;
    },
    async (s) => {
      await login(s);
      return ((await s.page.locator(dt('about-sidebar-link')).getAttribute('href')) ?? '').includes('/error/404');
    },
  ],
  'swag.error-user': [
    async (s) => {
      await addDoesNothing(s, ODD[0]!);
      return s.errors.some((e) => e.includes('Failed to add item to the cart'));
    },
    ...ODD.map((slug) => (s: S) => addDoesNothing(s, slug)),
    ...EVEN.map((slug) => (s: S) => removeDoesNothing(s, slug)),
    async (s) => {
      await login(s);
      await s.page.selectOption(dt('product-sort-container'), 'za');
      await pause(300);
      return s.dialogs.some((d) => d.includes('Sorting is broken!'));
    },
    sortIgnored,
    async (s) => {
      await login(s);
      await open(s, '/inventory-item.html?id=4');
      await s.page.locator(dt('inventory-item-price')).waitFor();
      return s.consoleErrors.some((e) => e.includes('This component failed to render'));
    },
    async (s) => {
      await login(s);
      await open(s, '/inventory-item.html?id=4');
      await s.page.locator(dt('inventory-item-price')).waitFor();
      return (await count(s, dt('inventory-item-desc'))) === 0;
    },
    async (s) => {
      await stepOne(s);
      await s.page.locator(dt('lastName')).pressSequentially('Lo');
      return s.errors.some((e) => e.includes('TypeError') || e.includes('Cannot read properties'));
    },
    async (s) => {
      await stepOne(s);
      await s.page.locator(dt('lastName')).pressSequentially('Lovelace');
      return (await s.page.inputValue(dt('lastName'))) === '';
    },
    async (s) => {
      await toOverview(s, ['sauce-labs-backpack']);
      await s.page.click(dt('finish'));
      await pause(300);
      return s.errors.some((e) => e.includes('cesetRart'));
    },
    async (s) => {
      await toOverview(s, ['sauce-labs-backpack']);
      await s.page.click(dt('finish'));
      await pause(500);
      return s.page.url().endsWith('/checkout-step-two.html') && (await count(s, dt('checkout-complete-container'))) === 0;
    },
  ],
  'swag.visual-user': [
    async (s) => { await login(s); return displaced(await cartLinkBox(s)); },
    async (s) => {
      await login(s);
      return (await s.page.locator(dt('open-menu')).evaluate((e) => getComputedStyle(e).transform)) !== 'none';
    },
    async (s) => {
      await login(s);
      return ((await s.page.locator(dt('inventory-item-sauce-labs-backpack-img')).getAttribute('src')) ?? '').includes('sl-404');
    },
    async (s) => {
      await login(s);
      const aligns = await s.page.locator(dt('inventory-item-name')).evaluateAll((els) => els.map((e) => getComputedStyle(e).textAlign));
      return aligns.includes('right');
    },
    async (s) => {
      await login(s);
      return s.page.locator(dt('add-to-cart-test.allthethings()-t-shirt-(red)')).evaluate((b) => {
        const card = b.closest('.inventory_item')!.getBoundingClientRect();
        return b.getBoundingClientRect().right > card.right + 1;
      });
    },
    async (s) => {
      await login(s);
      const names = await s.page.locator(dt('inventory-item-name')).allInnerTexts();
      const prices = await s.page.locator(`${dt('inventory-list')} ${dt('inventory-item-price')}`).allInnerTexts();
      const listPrice = money(prices[names.indexOf('Sauce Labs Backpack')]!);
      await open(s, '/inventory-item.html?id=4');
      return listPrice !== money(await text(s, dt('inventory-item-price')));
    },
    async (s) => {
      await login(s);
      await s.page.click(dt('shopping-cart-link'));
      const b = await s.page.locator(dt('checkout')).boundingBox();
      return (b?.y ?? 999) < 56;
    },
    async (s) => {
      await login(s);
      await s.page.click(dt('shopping-cart-link'));
      await s.page.locator(dt('cart-list')).waitFor();
      return displaced(await cartLinkBox(s));
    },
    async (s) => {
      await login(s);
      await s.page.selectOption(dt('product-sort-container'), 'lohi');
      await pause(300);
      const shown = (await s.page.locator(`${dt('inventory-list')} ${dt('inventory-item-price')}`).allInnerTexts()).map(money);
      return shown.some((p, i) => i > 0 && p < shown[i - 1]!);
    },
    // Added after the visual-track runs: the same symptoms, reported without the button's selector, on the cart page,
    // and as a price format fault.
    async (s) => {
      await login(s);
      return s.page.locator(dt('add-to-cart-test.allthethings()-t-shirt-(red)')).evaluate((b) => {
        const card = b.closest('.inventory_item')!.getBoundingClientRect();
        return b.getBoundingClientRect().right > card.right + 1;
      });
    },
    async (s) => {
      await login(s);
      const names = await s.page.locator(dt('inventory-item-name')).allInnerTexts();
      const prices = await s.page.locator(`${dt('inventory-list')} ${dt('inventory-item-price')}`).allInnerTexts();
      const listed = money(prices[names.indexOf('Sauce Labs Backpack')]!);
      await s.page.click(dt('add-to-cart-sauce-labs-backpack'));
      await open(s, '/cart.html');
      return listed !== money(await text(s, dt('inventory-item-price')));
    },
    async (s) => {
      // Random prices are rounded to cents but printed without toFixed, so some show one decimal ("$13.4").
      await login(s);
      for (let i = 0; i < 25; i++) {
        const prices = await s.page.locator(`${dt('inventory-list')} ${dt('inventory-item-price')}`).allInnerTexts();
        if (prices.some((p) => /^\$\d+\.\d$/.test(p.trim()))) return true;
        await s.page.reload();
        await s.page.locator(dt('inventory-list')).waitFor();
      }
      return false;
    },
    async (s) => { await login(s); return displaced(await cartLinkBox(s)); },
    async (s) => {
      await login(s);
      const names = await s.page.locator(dt('inventory-item-name')).allInnerTexts();
      const prices = await s.page.locator(`${dt('inventory-list')} ${dt('inventory-item-price')}`).allInnerTexts();
      const listPrice = money(prices[names.indexOf('Sauce Labs Backpack')]!);
      await open(s, '/inventory-item.html?id=4');
      return listPrice !== money(await text(s, dt('inventory-item-price')));
    },
  ],
  // Natural defects: real bugs present on every build (they must show on the clean build).
  'swag.unrounded-item-total': [
    async (s) => {
      await login(s);
      await s.page.click(dt('add-to-cart-sauce-labs-bike-light'));
      await s.page.click(dt('add-to-cart-sauce-labs-fleece-jacket'));
      await open(s, '/checkout-step-one.html');
      await s.page.fill(dt('firstName'), 'Ada');
      await s.page.fill(dt('lastName'), 'Lovelace');
      await s.page.fill(dt('postalCode'), '10001');
      await s.page.click(dt('continue'));
      return (await text(s, dt('subtotal-label'))).includes('59.980000000000004');
    },
  ],
  'swag.not-found-item-page': [
    async (s) => {
      await login(s);
      await open(s, '/inventory-item.html?id=99');
      return (await text(s, dt('inventory-item-name'))).includes('ITEM NOT FOUND') && (await count(s, dt('add-to-cart'))) === 1;
    },
  ],
  'swag.reset-keeps-remove-buttons': [
    async (s) => {
      await login(s);
      await s.page.click(dt('add-to-cart-sauce-labs-bike-light'));
      await s.page.click('#react-burger-menu-btn');
      await s.page.click(dt('reset-sidebar-link'));
      await pause(300);
      return (await count(s, dt('shopping-cart-badge'))) === 0 && (await count(s, dt('remove-sauce-labs-bike-light'))) === 1;
    },
  ],
  'swag.empty-cart-checkout': [
    async (s) => {
      await login(s);
      await open(s, '/cart.html');
      if ((await count(s, dt('inventory-item'))) !== 0) return false;
      await s.page.click(dt('checkout'));
      await s.page.fill(dt('firstName'), 'Ada');
      await s.page.fill(dt('lastName'), 'Lovelace');
      await s.page.fill(dt('postalCode'), '10001');
      await s.page.click(dt('continue'));
      const total = await text(s, dt('total-label'));
      await s.page.click(dt('finish'));
      await s.page.locator(dt('complete-header')).waitFor();
      return total.includes('$0.00') && s.page.url().endsWith('/checkout-complete.html');
    },
  ],
  'swag.no-security-headers': [
    async (s) => {
      const pages = [await fetch(s.base + '/'), await fetch(s.base + '/inventory.html')];
      return pages.every((r) => r.status === 200 && !['content-security-policy', 'x-frame-options', 'x-content-type-options'].some((h) => r.headers.has(h)));
    },
  ],
  'swag.blank-not-found-page': [
    async (s) => {
      const res = await s.page.goto(s.base + '/nonexistent');
      await pause(500);
      const shown = (await s.page.locator('body').innerText()).trim();
      return res?.status() === 404 && shown === '';
    },
  ],
  'swag.focus-indicator-missing': [
    async (s) => {
      await login(s);
      await s.page.locator(dt('add-to-cart-sauce-labs-backpack')).focus();
      await s.page.keyboard.press('Tab');
      return s.page.evaluate(() => {
        const st = getComputedStyle(document.activeElement!);
        return document.activeElement !== document.body && (st.outlineStyle === 'none' || st.outlineWidth === '0px') && st.boxShadow === 'none';
      });
    },
  ],
  'swag.cart-link-not-focusable': [
    async (s) => {
      await login(s);
      const link = s.page.locator(dt('shopping-cart-link'));
      const attrs = await link.evaluate((a) => ({ href: a.getAttribute('href') }));
      // Tab through the page from the top: focus never lands on the cart link.
      await s.page.locator('body').focus();
      let reached = false;
      for (let i = 0; i < 40 && !reached; i++) {
        await s.page.keyboard.press('Tab');
        reached = await s.page.evaluate(() => document.activeElement?.getAttribute('data-test') === 'shopping-cart-link');
      }
      return attrs.href === null && !reached; // (Chromium reports tabIndex 0 for an <a> without href, though Tab skips it)
    },
  ],
  'swag.small-tap-targets': [
    async (s) => {
      await s.page.setViewportSize({ width: 390, height: 844 });
      await login(s);
      const b = await s.page.locator('#react-burger-menu-btn').boundingBox();
      return !!b && (b.width < 24 || b.height < 24);
    },
  ],
  'swag.cart-count-grammar': [
    async (s) => {
      await login(s);
      await s.page.click(dt('add-to-cart-sauce-labs-backpack'));
      await pause(200);
      return (await s.page.locator(dt('shopping-cart-link')).getAttribute('aria-label')) === 'Cart, 1 items';
    },
  ],
  'swag.performance-glitch-user': [
    async (s) => {
      await login(s);
      return (await msToProducts(s, () => open(s, '/inventory.html'))) >= 4000;
    },
    async (s) => {
      await s.page.goto(s.base + '/');
      await s.page.fill(dt('username'), ACCOUNT.username);
      await s.page.fill(dt('password'), ACCOUNT.password);
      return (await msToProducts(s, () => s.page.click(dt('login-button')))) >= 4000;
    },
    async (s) => {
      await login(s);
      const t0 = Date.now();
      await s.page.selectOption(dt('product-sort-container'), 'za');
      await s.page.waitForFunction(() => document.querySelector('[data-test="inventory-item-name"]')?.textContent === 'Test.allTheThings() T-Shirt (Red)', null, { timeout: 20000 });
      return Date.now() - t0 >= 4000;
    },
  ],
  'swag.locked-out-user': [
    async (s) => { await login(s); return (await count(s, dt('error'))) > 0 && (await text(s, dt('error'))).includes('locked out'); },
    async (s) => { await login(s); await pause(300); return !s.page.url().endsWith('/inventory.html'); },
    async (s) => {
      await login(s);
      await open(s, '/inventory.html');
      await s.page.locator(`${dt('inventory-list')}, ${dt('error')}`).first().waitFor();
      return (await count(s, dt('inventory-list'))) === 0 && (await text(s, dt('error'))).includes('You can only access');
    },
    async (s) => {
      await login(s);
      await open(s, '/cart.html');
      await s.page.locator(`${dt('cart-list')}, ${dt('login-button')}`).first().waitFor();
      return (await count(s, dt('cart-list'))) === 0;
    },
  ],
  'swag.relabel': [
    async (s) => { await login(s); return (await text(s, dt('add-to-cart-sauce-labs-backpack'))) === 'Add to basket'; },
    async (s) => { await login(s); return (await s.page.getByRole('button', { name: 'Add to cart', exact: true }).count()) === 0; },
    async (s) => { await login(s); await open(s, '/inventory-item.html?id=4'); return (await text(s, dt('add-to-cart'))) === 'Add to basket'; },
    async (s) => {
      await login(s);
      await open(s, '/inventory-item.html?id=4');
      return (await s.page.getByRole('button', { name: 'Add to cart', exact: true }).count()) === 0;
    },
    async (s) => { await login(s); await s.page.click(dt('shopping-cart-link')); await s.page.locator(dt('cart-list')).waitFor(); return (await text(s, dt('title'))) === 'Your Basket'; },
    async (s) => { await login(s); await s.page.click(dt('shopping-cart-link')); await s.page.locator(dt('cart-list')).waitFor(); return (await s.page.getByText('Your Cart').count()) === 0; },
    async (s) => { await login(s); return ((await s.page.locator(dt('shopping-cart-link')).getAttribute('aria-label')) ?? '').startsWith('Basket'); },
    async (s) => { await login(s); return (await s.page.getByText('Add to basket').count()) > 0; },
  ],
  'swag.seasonal-banner': [
    async (s) => { await login(s); return s.page.locator(dt('seasonal-banner')).isVisible(); },
    async (s) => {
      await login(s);
      const top = (await s.page.locator(dt('inventory-list')).boundingBox())?.y ?? 0;
      return top >= cleanListTop + 30;
    },
    async (s) => { await login(s); return (await count(s, dt('seasonal-banner'))) > 0 && (await text(s, dt('seasonal-banner'))).startsWith('Winter sale'); },
    async (s) => { await login(s); return (await count(s, dt('seasonal-banner'))) === 1; },
  ],
  'swag.checkout-copy': [
    async (s) => { await stepOne(s); return (await text(s, dt('title'))) === 'Checkout: Your details'; },
    async (s) => { await toOverview(s, ['sauce-labs-onesie']); return (await text(s, dt('title'))) === 'Checkout: Review your order'; },
    async (s) => { await toOverview(s, ['sauce-labs-onesie']); await finishOrder(s); return (await text(s, dt('complete-header'))) === 'Order placed. Thank you!'; },
    async (s) => { await toOverview(s, ['sauce-labs-onesie']); await finishOrder(s); return (await text(s, dt('complete-text'))).includes('on its way'); },
    async (s) => { await toOverview(s, ['sauce-labs-onesie']); await finishOrder(s); return (await s.page.getByText('Thank you for your order!').count()) === 0; },
  ],
  'swag.price-change': [
    async (s) => {
      await login(s);
      const names = await s.page.locator(dt('inventory-item-name')).allInnerTexts();
      const prices = await s.page.locator(`${dt('inventory-list')} ${dt('inventory-item-price')}`).allInnerTexts();
      return prices[names.indexOf('Sauce Labs Backpack')] === '$24.99';
    },
    async (s) => { await login(s); await open(s, '/inventory-item.html?id=4'); return (await text(s, dt('inventory-item-price'))) === '$24.99'; },
    async (s) => {
      await login(s);
      await s.page.click(dt('add-to-cart-sauce-labs-backpack'));
      await s.page.click(dt('shopping-cart-link'));
      return (await text(s, `${dt('cart-list')} ${dt('inventory-item-price')}`)) === '$24.99';
    },
    async (s) => { await toOverview(s, ['sauce-labs-backpack']); return (await text(s, dt('subtotal-label'))) === 'Item total: $24.99'; },
    async (s) => { await toOverview(s, ['sauce-labs-backpack']); return (await text(s, dt('total-label'))) === 'Total: $26.99'; },
    async (s) => { await login(s); return (await s.page.locator(dt('inventory-item-price')).allInnerTexts()).includes('$24.99'); },
  ],
};

/** The regression journey a clean build (and every deliberate change) must pass. Returns problems found. */
async function fullCheckout(base: string): Promise<string[]> {
  return session(base, async (s) => {
    const problems: string[] = [];
    await login(s);
    if ((await count(s, dt('inventory-item'))) !== 6) problems.push('product list does not show 6 products');
    await toOverview(s, ['sauce-labs-backpack', 'sauce-labs-bike-light']);
    const t = await overviewTotals(s);
    if (t.prices.length !== 2) problems.push(`overview lists ${t.prices.length} items, expected 2`);
    if (!consistent(t)) problems.push(`totals inconsistent: ${JSON.stringify(t)}`);
    await finishOrder(s);
    if ((await count(s, dt('shopping-cart-badge'))) !== 0) problems.push('cart not empty after Finish');
    await s.page.click(dt('back-to-products'));
    await s.page.locator(dt('inventory-list')).waitFor();
    await s.page.click('#react-burger-menu-btn');
    await s.page.click(dt('logout-sidebar-link'));
    await s.page.locator(dt('login-button')).waitFor();
    await open(s, '/inventory.html');
    if ((await count(s, dt('inventory-list'))) > 0) problems.push('still signed in after Logout');
    if (s.errors.length || s.consoleErrors.length) problems.push(`page errors: ${[...s.errors, ...s.consoleErrors].join('; ')}`);
    return problems;
  });
}

// ---- run ---------------------------------------------------------------------------------------------------------
function labels(): { id: string; entries: number; env: Record<string, string>; natural?: boolean }[] {
  const out = [];
  for (const kind of ['mutations', 'changes', 'natural']) {
    if (!existsSync(join(here, kind))) continue;
    for (const dir of readdirSync(join(here, kind))) {
      const l = YAML.parse(readFileSync(join(here, kind, dir, 'label.yaml'), 'utf8'));
      out.push({ id: l.id as string, entries: (l.found_by as unknown[]).length, env: (l.switch?.env ?? {}) as Record<string, string>, natural: kind === 'natural' });
    }
  }
  return out.filter((l) => !only || l.id === only);
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

const clean = start({});
try {
  await waitUp(clean);
  cleanListTop = await session(clean.base, async (s) => { await login(s); return (await s.page.locator(dt('inventory-list')).boundingBox())?.y ?? 0; });

  if (!only) {
    const problems = await fullCheckout(clean.base);
    report(problems.length === 0, `clean build: full checkout with a generated account${problems.length ? ': ' + problems.join('; ') : ''}`);
    const refused = await session(clean.base, async (s) => {
      await login(s, { username: 'standard_user', password: 'secret_sauce' });
      const hint = await text(s, dt('login-credentials'));
      return (await count(s, dt('inventory-list'))) === 0 && !hint.includes('standard_user');
    });
    report(refused, 'bench mode: built-in standard_user is refused and not advertised');
    const rt = await (await fetch(clean.base + '/runtime-config.js')).text();
    const leaks = [ACCOUNT.username, ACCOUNT.password, Buffer.from(`${ACCOUNT.username}:${ACCOUNT.password}`).toString('base64').slice(0, 12)]
      .filter((t) => rt.includes(t));
    report(leaks.length === 0, `runtime config holds only hashed accounts${leaks.length ? ` (found ${leaks.join(', ')})` : ''}`);
  }

  for (const l of labels()) {
    const list = checks[l.id];
    if (!list || list.length !== l.entries) {
      report(false, `${l.id}: ${l.entries} found_by entries but ${list?.length ?? 0} checks`);
      continue;
    }
    if (l.natural) { await runChecks(clean.base, l.id, true); continue; }
    await runChecks(clean.base, l.id, false);
    const app = start(l.env);
    try {
      await waitUp(app);
      await runChecks(app.base, l.id, true);
      if (l.id.startsWith('swag.') && Object.keys(l.env).includes('QA_BENCH_CHANGES')) {
        const problems = await fullCheckout(app.base);
        report(problems.length === 0, `${l.id}: behaviour unchanged (full checkout)${problems.length ? ': ' + problems.join('; ') : ''}`);
      }
    } finally { app.stop(); }
  }

  if (!only) {
    // Every change at once (comma-joined, as the generator does) still checks out correctly and shows each change.
    const all = start({ QA_BENCH_CHANGES: 'relabel,seasonal-banner,checkout-copy,price-change' });
    try {
      await waitUp(all);
      const problems = await fullCheckout(all.base);
      report(problems.length === 0, `all changes together: full checkout${problems.length ? ': ' + problems.join('; ') : ''}`);
      for (const id of ['swag.relabel', 'swag.seasonal-banner', 'swag.checkout-copy', 'swag.price-change']) {
        report(await session(all.base, checks[id]![0]!), `all changes together: ${id}[0] shows`);
      }
    } finally { all.stop(); }
  }
} finally {
  clean.stop();
  await browser.close();
}

console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
