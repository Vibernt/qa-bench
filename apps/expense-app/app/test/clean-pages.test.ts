import { it, expect } from 'vitest';
import { createServer as originalServer } from './fixtures/pre-hu-g-server.js';
import { startApp, postForm } from './helpers.js';

// Captured from the unmodified HU-G input, before adding switches. Never regenerate for a mutation.
it('preserves the original clean response bytes for viewer and editor', async () => {
  const app = await startApp();
  const original = await startApp('', '', originalServer);
  try {

    for (const role of ['viewer', 'editor'] as const) {
      const cookie = await app.login(role);
      const beforeCookie = await original.login(role);
      for (const path of ['/login', '/theme.css', '/expenses', '/expenses?category=meals', '/expenses/new', '/expenses/2/edit', '/missing']) {
        const response = await fetch(app.baseUrl + path, { headers: { cookie }, redirect: 'manual' });
        const before = await fetch(original.baseUrl + path, { headers: { cookie: beforeCookie }, redirect: 'manual' });
        expect(response.status, `${role} ${path}`).toBe(before.status);
        expect(await response.text(), `${role} ${path}`).toBe(await before.text());
      }
      const rejected = await postForm(app.baseUrl, '/expenses', cookie, { title: ' ', category: 'office', amount: '-1' });
      const before = await postForm(original.baseUrl, '/expenses', beforeCookie, { title: ' ', category: 'office', amount: '-1' });
      expect(rejected.status).toBe(before.status);
      expect(await rejected.text()).toBe(await before.text());
    }
  } finally { await app.close(); await original.close(); }
});
