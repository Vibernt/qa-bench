import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, seed } from '../src/server.js';
import type { AuthLifecycleOptions, FixtureMail } from '../src/auth-lifecycle/types.js';
import { fixtureTotp } from '../src/auth-lifecycle/totp.js';

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => { for (const close of cleanup.splice(0)) await close(); });
async function app(flags: Partial<AuthLifecycleOptions> = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'qab-auth-')); const dbPath = join(dir, 'db'); seed(dbPath);
  const options: AuthLifecycleOptions = { mode: 'multi-step', tenant: 'tenant-a', ...flags };
  const server = createServer({ dbPath, authLifecycle: options });
  cleanup.push(async () => { await new Promise<void>(resolve => server.close(() => resolve())); await rm(dir, { recursive: true }); });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No listener');
  const base = `http://127.0.0.1:${address.port}`;
  const post = (path: string, cookie: string, values: Record<string, string>) => fetch(base + path, { method: 'POST', redirect: 'manual', headers: { cookie }, body: new URLSearchParams(values) });
  const get = (path: string, cookie = '') => fetch(base + path, { redirect: 'manual', headers: { cookie } });
  const firstCookie = (res: Response) => res.headers.getSetCookie()[0]?.split(';')[0] ?? '';
  const begin = async (username = 'editor') => firstCookie(await post('/login', '', { username }));
  const password = async (challenge: string, username = 'editor') => post('/auth/password', challenge, { password: `${username}-test-password` });
  const login = async (username = 'editor') => firstCookie(await password(await begin(username), username));
  return { post, get, begin, password, login, firstCookie, options };
}

it('multi-step sign-in authenticates only after password; logout revokes the old cookie', async () => {
  const a = await app();
  const challenge = await a.begin();
  expect((await a.get('/expenses', challenge)).status).toBe(303);
  expect(await (await a.get('/auth/identity', challenge)).json()).toEqual({ complete: false });
  const cookie = a.firstCookie(await a.password(challenge));
  expect(await (await a.get('/auth/identity', cookie)).json()).toMatchObject({ complete: true, account: 'editor', role: 'editor', tenant: 'tenant-a' });
  expect((await a.get('/expenses', cookie)).status).toBe(200);
  await a.post('/logout', cookie, {});
  expect((await a.get('/auth/identity', cookie)).status).toBe(401);
});

it('failed passwords consume their challenge and never echo credential bytes', async () => {
  const a = await app(); const challenge = await a.begin();
  const failed = await a.post('/auth/password', challenge, { password: 'SECRET-REJECTED' });
  expect(failed.status).toBe(401); expect(await failed.text()).not.toContain('SECRET-REJECTED');
  expect((await a.password(challenge)).status).toBe(401);
});

it('expires partial and complete sign-ins using the injected clock', async () => {
  let now = 0; const a = await app({ now: () => now, ttlMs: 100, challengeTtlMs: 50 });
  const challenge = await a.begin(); now = 50;
  expect((await a.password(challenge)).status).toBe(401);
  const cookie = await a.login(); now = 150;
  expect((await a.get('/auth/identity', cookie)).status).toBe(401);
});

it('TOTP matches the RFC vector and rejects incorrect or replayed verification', async () => {
  const secret = Buffer.from('12345678901234567890');
  expect(fixtureTotp(secret, 59_000)).toBe('287082');
  const a = await app({ mode: 'totp', totpSecret: secret, now: () => 59_000 });
  const challenge = await a.begin();
  expect((await a.password(challenge)).status).toBe(200);
  expect((await a.get('/auth/identity', challenge)).status).toBe(401);
  const verified = await a.post('/auth/verify', challenge, { code: fixtureTotp(secret, 59_000) });
  expect(verified.status).toBe(303);
  expect((await a.post('/auth/verify', challenge, { code: fixtureTotp(secret, 59_000) })).status).toBe(401);
  const wrong = await a.begin(); await a.password(wrong);
  expect((await a.post('/auth/verify', wrong, { code: '000000' })).status).toBe(401);
  expect((await a.post('/auth/verify', wrong, { code: fixtureTotp(secret, 59_000) })).status).toBe(401);
});

it('magic links are account-bound, single-use and available only from the host mail sink', async () => {
  const sink: FixtureMail[] = []; const a = await app({ mode: 'magic-link', mailSink: sink });
  const editor = await a.begin(); const viewer = await a.begin('viewer');
  const res = await a.password(editor); await a.password(viewer, 'viewer');
  const token = sink.find(x => x.account === 'editor')!.token;
  expect(await res.text()).not.toContain(token);
  expect((await a.get('/auth/mail')).status).toBe(404);
  expect((await a.post('/auth/verify', viewer, { code: token })).status).toBe(401);
  expect((await a.post('/auth/verify', editor, { code: token })).status).toBe(303);
  expect((await a.post('/auth/verify', editor, { code: token })).status).toBe(401);
  const malformed = await a.begin(); await a.password(malformed);
  expect((await a.post('/auth/verify', malformed, { code: 'é'.repeat(64) })).status).toBe(401);
});

it('exposes wrong identity despite a plausible signed-in banner, role changes and invalid sessions', async () => {
  const a = await app({ wrongUser: { id: 1, username: 'viewer', role: 'viewer' } });
  const cookie = await a.login(); const page = await (await a.get('/expenses', cookie)).text();
  expect(page).toContain('Signed in as editor');
  expect(page).toContain('data-account="viewer"');
  expect(await (await a.get('/auth/identity', cookie)).json()).toMatchObject({ account: 'viewer', role: 'viewer' });
  a.options.changedRole = 'editor';
  expect(await (await a.get('/auth/identity', cookie)).json()).toMatchObject({ role: 'editor' });
  a.options.invalidSession = true;
  expect((await a.get('/auth/identity', cookie)).status).toBe(401);
});

it('keeps concurrent accounts and server namespaces isolated', async () => {
  const a = await app(); const b = await app({ tenant: 'tenant-b' });
  const [editor, viewer] = await Promise.all([a.login(), a.login('viewer')]);
  expect(await (await a.get('/auth/identity', editor)).json()).toMatchObject({ account: 'editor' });
  expect(await (await a.get('/auth/identity', viewer)).json()).toMatchObject({ account: 'viewer' });
  expect((await b.get('/auth/identity', editor)).status).toBe(401);
});

it('rejects missing secret infrastructure and bad TTL without choosing another mode', async () => {
  expect(() => createServer({ dbPath: ':memory:', authLifecycle: { mode: 'totp', tenant: 'a' } })).toThrow('secret');
  expect(() => createServer({ dbPath: ':memory:', authLifecycle: { mode: 'magic-link', tenant: 'a' } })).toThrow('mail sink');
  expect(() => createServer({ dbPath: ':memory:', authLifecycle: { mode: 'multi-step', tenant: 'a', ttlMs: 0 } })).toThrow('TTL');
});
