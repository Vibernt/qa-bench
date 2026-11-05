import { afterEach, describe, expect, it } from 'vitest';
import { postForm, startApp, type RunningApp } from './helpers.js';
import { parseDefects } from '../src/server.js';

const apps: RunningApp[] = [];
async function app(defect: Parameters<typeof startApp>[0]): Promise<RunningApp> {
  const running = await startApp(defect);
  apps.push(running);
  return running;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((running) => running.close()));
});

describe('seeded defects retain a successful UI response', () => {
  it('missing_persistence displays success without inserting a row', async () => {
    const running = await app('missing_persistence');
    const cookie = await running.login();
    const response = await postForm(running.baseUrl, '/expenses', cookie, { title: 'Missing row', category: 'meals', amount: '3.50' });
    expect(response.status).toBe(303);
    const html = await (await fetch(`${running.baseUrl}${response.headers.get('location')}`, { headers: { cookie } })).text();
    expect(html).toContain('role="status">Expense saved');
    expect(running.countByTitle('Missing row')).toBe(0);
  });

  it('duplicate_write displays success and inserts exactly twice', async () => {
    const running = await app('duplicate_write');
    const cookie = await running.login();
    const response = await postForm(running.baseUrl, '/expenses', cookie, { title: 'Duplicate row', category: 'meals', amount: '3.50' });
    const html = await (await fetch(`${running.baseUrl}${response.headers.get('location')}`, { headers: { cookie } })).text();
    expect(html).toContain('role="status">Expense saved');
    expect(running.countByTitle('Duplicate row')).toBe(2);
  });

  it('misleading_success shows update status but preserves stored values', async () => {
    const running = await app('misleading_success');
    const cookie = await running.login();
    const response = await postForm(running.baseUrl, '/expenses/1', cookie, { title: 'Changed title', category: 'office', amount: '99.00' });
    const html = await (await fetch(`${running.baseUrl}${response.headers.get('location')}`, { headers: { cookie } })).text();
    expect(html).toContain('role="status">Expense updated');
    expect(running.expenseAmount(1)).toBe(4250);
    expect(running.countByTitle('Changed title')).toBe(0);
  });

  it('permission_bypass allows viewer edit GET and applied POST update', async () => {
    const running = await app('permission_bypass');
    const cookie = await running.login('viewer');
    expect((await fetch(`${running.baseUrl}/expenses/1/edit`, { headers: { cookie } })).status).toBe(200);
    expect((await fetch(`${running.baseUrl}/expenses/new`, { headers: { cookie } })).status).toBe(403);
    const response = await postForm(running.baseUrl, '/expenses/1', cookie, { title: 'Viewer changed it', category: 'travel', amount: '44.00' });
    expect(response.status).toBe(303);
    expect(running.expenseAmount(1)).toBe(4400);
  });

  it('ignored_filter returns all rows while retaining the selected category', async () => {
    const running = await app('ignored_filter');
    const cookie = await running.login('viewer');
    const response = await fetch(`${running.baseUrl}/expenses?category=meals`, { headers: { cookie } });
    const html = await response.text();
    expect(html).toContain('<option value="meals" selected>meals</option>');
    expect(html).toContain('Train to Pune');
    expect(html.match(/<tr>/g)).toHaveLength(9);
  });

  it('wrong_total omits the final row from the displayed total', async () => {
    const running = await app('wrong_total');
    const cookie = await running.login('viewer');
    const html = await (await fetch(`${running.baseUrl}/expenses`, { headers: { cookie } })).text();
    expect(html).toContain('data-testid="total">Total: $306.74');
    expect(html).toContain('Project dinner');
  });

  it('stale_state keeps the cached list after a successful create', async () => {
    const running = await app('stale_state');
    const cookie = await running.login();
    await fetch(`${running.baseUrl}/expenses`, { headers: { cookie } });
    const response = await postForm(running.baseUrl, '/expenses', cookie, { title: 'Stale list row', category: 'office', amount: '7.00' });
    const html = await (await fetch(`${running.baseUrl}${response.headers.get('location')}`, { headers: { cookie } })).text();
    expect(html).toContain('role="status">Expense saved');
    expect(html).not.toContain('Stale list row');
    expect(running.countByTitle('Stale list row')).toBe(1);
  });
});

function listRows(html: string): { title: string; category: string; amount: string }[] {
  const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? '';
  return [...body.matchAll(/<tr><td>(.*?)<\/td><td>(.*?)<\/td><td>\$([\d.]+)<\/td>/g)].map((m) => ({ title: m[1]!, category: m[2]!, amount: m[3]! }));
}

describe('defect selection', () => {
  it('parses one name, a comma-separated list or an array, and rejects unknown names', () => {
    expect([...parseDefects('')]).toEqual([]);
    expect([...parseDefects(' wrong_total , edit_drops_cents,')]).toEqual(['wrong_total', 'edit_drops_cents']);
    expect([...parseDefects(['title_not_escaped'])]).toEqual(['title_not_escaped']);
    expect(() => parseDefects('wrong_totl')).toThrow(/Unknown DEFECT/);
  });

  it('switches on several defects at once', async () => {
    const running = await app('wrong_total,edit_drops_cents,title_not_escaped');
    const cookie = await running.login();
    await postForm(running.baseUrl, '/expenses/2', cookie, { title: '<b>bold</b>', category: 'meals', amount: '12.50' });
    const html = await (await fetch(`${running.baseUrl}/expenses`, { headers: { cookie } })).text();
    expect(running.expenseAmount(2)).toBe(1200);
    expect(html).toContain('<td><b>bold</b></td>');
    expect(html).toContain('data-testid="total">Total: $250.34'); // $306.74 - $68.40 + $12.00, still without the last row
  });
});

describe('subtle defects', () => {
  it('total_under_filter sums every row under a filter but not without one', async () => {
    const running = await app('total_under_filter');
    const cookie = await running.login('viewer');
    const filtered = await (await fetch(`${running.baseUrl}/expenses?category=meals`, { headers: { cookie } })).text();
    expect(listRows(filtered)).toHaveLength(3);
    expect(filtered).toContain('data-testid="total">Total: $399.99');
    const all = await (await fetch(`${running.baseUrl}/expenses`, { headers: { cookie } })).text();
    expect(all).toContain('data-testid="total">Total: $399.99');
  });

  it('delete_open_to_viewer hides the button but accepts the viewer POST', async () => {
    const running = await app('delete_open_to_viewer');
    const cookie = await running.login('viewer');
    const html = await (await fetch(`${running.baseUrl}/expenses`, { headers: { cookie } })).text();
    expect(html).not.toContain('/delete');
    expect((await postForm(running.baseUrl, '/expenses/3/delete', cookie, {})).status).toBe(303);
    expect(running.expenseAmount(3)).toBeUndefined();
    expect((await postForm(running.baseUrl, '/expenses/1', cookie, { title: 'x', category: 'travel', amount: '1.00' })).status).toBe(403);
  });

  it('edit_drops_cents truncates edited amounts only', async () => {
    const running = await app('edit_drops_cents');
    const cookie = await running.login();
    await postForm(running.baseUrl, '/expenses/2', cookie, { title: 'Team lunch', category: 'meals', amount: '12.50' });
    expect(running.expenseAmount(2)).toBe(1200);
    await postForm(running.baseUrl, '/expenses', cookie, { title: 'Cents kept', category: 'meals', amount: '12.50' });
    const html = await (await fetch(`${running.baseUrl}/expenses`, { headers: { cookie } })).text();
    expect(listRows(html).find((row) => row.title === 'Cents kept')?.amount).toBe('12.50');
  });

  it('long_title_truncated cuts titles to 20 characters on add and edit', async () => {
    const running = await app('long_title_truncated');
    const cookie = await running.login();
    await postForm(running.baseUrl, '/expenses', cookie, { title: 'Conference registration fee', category: 'travel', amount: '5.00' });
    await postForm(running.baseUrl, '/expenses/2', cookie, { title: 'Team lunch with the new client', category: 'meals', amount: '68.40' });
    expect(running.countByTitle('Conference registrat')).toBe(1);
    expect(running.countByTitle('Team lunch with the ')).toBe(1);
  });

  it('title_not_escaped renders list titles as markup', async () => {
    const running = await app('title_not_escaped');
    const cookie = await running.login();
    await postForm(running.baseUrl, '/expenses', cookie, { title: '<i>x</i>', category: 'office', amount: '1.00' });
    const html = await (await fetch(`${running.baseUrl}/expenses`, { headers: { cookie } })).text();
    expect(html).toContain('<td><i>x</i></td>');
    const form = await (await fetch(`${running.baseUrl}/expenses/9/edit`, { headers: { cookie } })).text();
    expect(form).toContain('value="&lt;i&gt;x&lt;/i&gt;"');
  });

  it('edit_resets_category leaves the category unselected on the edit form', async () => {
    const running = await app('edit_resets_category');
    const cookie = await running.login();
    const form = await (await fetch(`${running.baseUrl}/expenses/2/edit`, { headers: { cookie } })).text();
    expect(form).not.toContain(' selected');
    const clean = await app('');
    const cleanCookie = await clean.login();
    expect(await (await fetch(`${clean.baseUrl}/expenses/2/edit`, { headers: { cookie: cleanCookie } })).text()).toContain('<option value="meals" selected>');
  });
});
