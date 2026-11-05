import { afterEach, describe, expect, it } from 'vitest';
import { postForm, startApp, type RunningApp } from './helpers.js';

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
