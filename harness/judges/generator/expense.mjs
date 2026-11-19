import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createServer, seed } from '../../../apps/expense-app/app/src/server.ts';

export async function expenseTarget(recipe, baseline, account) {
  const dir = await mkdtemp(join(tmpdir(), 'qa-bench-judge-'));
  const dbPath = join(dir, 'seed.sqlite');
  seed(dbPath);
  if (recipe.group === 'expense.long-title-overflows') {
    const db = new DatabaseSync(dbPath);
    db.prepare('UPDATE expenses SET title = ? WHERE id = 1').run('Travel reimbursement for the annual engineering planning conference');
    db.close();
  }
  const server = createServer({ dbPath, defect: baseline ? '' : recipe.fault,
    variant: baseline ? '' : recipe.variant,
    authenticate: (username, password) => username === account.username && password === account.password
      ? { id: 2, username, role: 'editor', expiresAt: Date.now() + 60000 } : undefined });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { origin: `http://127.0.0.1:${server.address().port}`,
    close: async () => { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await rm(dir, { recursive: true, force: true }); } };
}
export async function prepareExpense(page, recipe, origin, account) {
  if (recipe.route === '/expenses') {
    const response = await page.request.post(`${origin}/login`, { form: account });
    if (!response.ok()) throw new Error('Fixture sign-in failed');
    await page.goto(`${origin}/expenses`);
  } else if (recipe.group === 'expense.login-error-invisible') {
    await page.goto(`${origin}/login`);
    await page.locator('input[name=username]').fill(account.username);
    await page.locator('input[name=password]').fill('deliberately-wrong');
    await page.locator('button[type=submit]').click();
    await page.locator('[role=alert]').waitFor();
  } else {
    await page.goto(`${origin}/login`);
    await page.keyboard.press('Tab');
  }
}
