import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { startSite } from '../../../apps/survey-site/app/server.mjs';
import { REPO_ROOT, sha256 } from '../../../lib/io.ts';
import { expenseTarget, prepareExpense } from './expense.mjs';

async function swagTarget(recipe, baseline, account) {
  const root = resolve(REPO_ROOT, 'apps/swag-labs/upstream/build');
  if (!existsSync(resolve(root, 'index.html'))) throw new Error('Swag Labs build missing: run npm ci and npm run build in apps/swag-labs/upstream');
  const salt = sha256(`judge-fixture/${recipe.id}`).slice(0, 32);
  const runtime = `window.__SL_RUNTIME__=${JSON.stringify({ s: salt,
    a: [`${sha256(`${salt}\n${account.username}`)}:${sha256(`${salt}\n${account.username}\n${account.password}`)}`],
    m: baseline || !recipe.fault ? 0 : 4, c: 0 })};`;
  const server = createServer((req, res) => {
    const path = new URL(req.url, 'http://fixture').pathname;
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    if (path === '/runtime-config.js') { res.setHeader('content-type', 'text/javascript'); res.end(runtime); return; }
    let file = resolve(root, '.' + decodeURIComponent(path));
    if (file !== root && !file.startsWith(root + '/')) { res.writeHead(403).end(); return; }
    const pages = ['/', '/inventory.html', '/inventory-item.html', '/cart.html', '/checkout-step-one.html', '/checkout-step-two.html', '/checkout-complete.html'];
    if (pages.includes(path)) file = resolve(root, 'index.html');
    if (!existsSync(file)) { res.writeHead(404).end(); return; }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
    res.setHeader('content-type', mime[extname(file)] ?? 'application/octet-stream');
    res.end(readFileSync(file));
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}
export async function target(recipe, baseline, account) {
  if (recipe.app === 'expense-app') return expenseTarget(recipe, baseline, account);
  if (recipe.app === 'survey-site') return startSite(baseline ? 'baseline' : recipe.variant);
  if (recipe.app === 'swag-labs') return swagTarget(recipe, baseline, account);
  throw new Error('Unknown fixture app');
}
export async function prepare(page, recipe, origin, account) {
  if (recipe.app === 'expense-app') return prepareExpense(page, recipe, origin, account);
  await page.goto(origin + (recipe.app === 'swag-labs' ? '/' : recipe.route));
  if (recipe.app === 'swag-labs') {
    await page.locator('[data-test=username]').fill(account.username);
    await page.locator('[data-test=password]').fill(account.password);
    await page.locator('[data-test=login-button]').click();
    await page.waitForURL('**/inventory.html');
    await page.locator('.inventory_item').first().waitFor();
  }
}
