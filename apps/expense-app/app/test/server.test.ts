import { afterEach, describe, expect, it } from 'vitest';
import { postForm, startApp, type RunningApp } from './helpers.js';

const apps: RunningApp[] = [];
async function app(): Promise<RunningApp> {
  const running = await startApp();
  apps.push(running);
  return running;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((running) => running.close()));
});

describe('expense app routes', () => {
  it('serves login, rejects bad credentials, and protects the expense list', async () => {
    const running = await app();
    const loginPage = await fetch(`${running.baseUrl}/login`);
    expect(await loginPage.text()).toContain('Username');
    const failed = await postForm(running.baseUrl, '/login', '', { username: 'viewer', password: 'wrong' });
    expect(failed.status).toBe(401);
    expect(await failed.text()).toContain('role="alert">Invalid credentials');

    const redirect = await fetch(`${running.baseUrl}/expenses`, { redirect: 'manual' });
    expect(redirect.status).toBe(303);
    expect(redirect.headers.get('location')).toBe('/login');
    const viewerCookie = await running.login('viewer');
    expect(viewerCookie).toContain('expense_session=');
    const setCookie = (await postForm(running.baseUrl, '/login', '', { username: 'viewer', password: 'viewer-test-password' })).headers.get('set-cookie');
    expect(setCookie).toContain('HttpOnly');
    const viewerList = await fetch(`${running.baseUrl}/expenses`, { headers: { cookie: viewerCookie } });
    const html = await viewerList.text();
    expect(html).toContain('<table aria-label="Expenses">');
    expect(html.match(/<tr>/g)).toHaveLength(9);
    expect(html).toContain('data-testid="total">Total: $399.99');
    expect(html).not.toContain('/expenses/new');
    expect((await fetch(`${running.baseUrl}/expenses/new`, { headers: { cookie: viewerCookie } })).status).toBe(403);
    expect((await fetch(`${running.baseUrl}/expenses?category=meals`, { headers: { cookie: viewerCookie } })).status).toBe(200);
    const filtered = await (await fetch(`${running.baseUrl}/expenses?category=meals`, { headers: { cookie: viewerCookie } })).text();
    expect(filtered).toContain('Team lunch');
    expect(filtered).not.toContain('Train to Pune');
    expect((await postForm(running.baseUrl, '/expenses/1', viewerCookie, { title: 'Denied edit', category: 'travel', amount: '55.00' })).status).toBe(403);
    expect((await postForm(running.baseUrl, '/expenses/1/delete', viewerCookie, {})).status).toBe(403);
    const logout = await postForm(running.baseUrl, '/logout', viewerCookie, {});
    expect(logout.status).toBe(303);
    expect((await fetch(`${running.baseUrl}/expenses`, { redirect: 'manual' })).status).toBe(303);
  });

  it('supports editor create, edit, delete, and logout flows', async () => {
    const running = await app();
    const cookie = await running.login('editor');
    const newPage = await fetch(`${running.baseUrl}/expenses/new`, { headers: { cookie } });
    const newHtml = await newPage.text();
    expect(newPage.status).toBe(200);
    expect(newHtml).toContain('label>Title');
    expect(newHtml).toContain('label>Category');
    expect(newHtml).toContain('label>Amount');
    const created = await postForm(running.baseUrl, '/expenses', cookie, { title: 'Test expense', category: 'office', amount: '12.34' });
    expect(created.status).toBe(303);
    const createdList = await fetch(`${running.baseUrl}${created.headers.get('location')}`, { headers: { cookie } });
    expect(await createdList.text()).toContain('role="status">Expense saved');
    expect(running.countByTitle('Test expense')).toBe(1);

    const editPage = await fetch(`${running.baseUrl}/expenses/1/edit`, { headers: { cookie } });
    expect(editPage.status).toBe(200);
    expect(await editPage.text()).toContain('Train to Pune');
    const updated = await postForm(running.baseUrl, '/expenses/1', cookie, { title: 'Updated train', category: 'travel', amount: '55.00' });
    expect(updated.status).toBe(303);
    const updatedList = await fetch(`${running.baseUrl}${updated.headers.get('location')}`, { headers: { cookie } });
    expect(await updatedList.text()).toContain('role="status">Expense updated');
    expect(running.expenseAmount(1)).toBe(5500);

    const deleted = await postForm(running.baseUrl, '/expenses/1/delete', cookie, {});
    expect(deleted.status).toBe(303);
    expect(running.expenseAmount(1)).toBeUndefined();
  });

  it('returns not found for unknown routes and invalid expense paths', async () => {
    const running = await app();
    const cookie = await running.login('editor');
    expect((await fetch(`${running.baseUrl}/not-a-route`)).status).toBe(404);
    expect((await fetch(`${running.baseUrl}/expenses/999/edit`, { headers: { cookie } })).status).toBe(404);
  });
});
