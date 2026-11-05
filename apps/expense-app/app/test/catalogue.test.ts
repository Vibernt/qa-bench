import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpenseFixture, EXPENSE_CATALOGUE, FixtureError, parseCatalogueEntry, verifyReset, readExpenseEvidence, type ResetEvidence } from '../src/catalogue/index.js';
import { createServer } from '../src/server.js';
import { FixtureIsolation } from '../src/isolation.js';
import { postForm } from './helpers.js';

const fixtures: ExpenseFixture[] = [];
const roots: string[] = [];
afterEach(async () => {
  for (const fixture of fixtures.splice(0)) await fixture.close();
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});
async function allocate(options: Record<string, unknown> = {}) {
  const root = await mkdtemp(join(tmpdir(), 'qab-catalogue-')); roots.push(root);
  const fixture = await ExpenseFixture.create({ ...EXPENSE_CATALOGUE, ...options }, root);
  fixtures.push(fixture); return fixture;
}
async function login(fixture: ExpenseFixture, role: 'viewer' | 'editor' = 'editor', ttlMs?: number) {
  const identity = fixture.issueIdentity(role, ttlMs);
  const response = await postForm(fixture.origin, '/login', '', { username: identity.username, password: identity.password });
  expect(response.status).toBe(303); await response.text();
  return { identity, cookie: response.headers.get('set-cookie')!.split(';')[0] };
}
const create = (fixture: ExpenseFixture, cookie: string, title = 'Catalogue expense', token = 'stable-job') =>
  postForm(fixture.origin, '/expenses', cookie, { title, category: 'office', amount: '12.34', idempotency_token: token });

it('parses only reviewed data and rejects unresolved or executable hooks without running them', () => {
  expect(parseCatalogueEntry(JSON.parse(JSON.stringify(EXPENSE_CATALOGUE)))).toEqual(EXPENSE_CATALOGUE);
  let invoked = false;
  for (const input of [null, {}, { ...EXPENSE_CATALOGUE, version: 'old' },
    { ...EXPENSE_CATALOGUE, hooks: { ...EXPENSE_CATALOGUE.hooks, start: () => { invoked = true; } } },
    { ...EXPENSE_CATALOGUE, command: 'touch /tmp/should-not-run' },
    { ...EXPENSE_CATALOGUE, roles: ['admin'] }, { ...EXPENSE_CATALOGUE, variant: 'unknown' },
    { ...EXPENSE_CATALOGUE, idempotency: undefined }]) expect(() => parseCatalogueEntry(input)).toThrow(FixtureError);
  expect(invoked).toBe(false);
});

it('rejects top-level and nested accessors without invoking them', () => {
  let reads = 0;
  const topLevel = { ...EXPENSE_CATALOGUE };
  Object.defineProperty(topLevel, 'schema', { enumerable: true, get() { reads++; return 'qa-bench.fixture/v1'; } });
  const nestedHooks = { ...EXPENSE_CATALOGUE.hooks };
  Object.defineProperty(nestedHooks, 'start', { enumerable: true, get() { reads++; return EXPENSE_CATALOGUE.hooks.start; } });
  expect(() => parseCatalogueEntry(topLevel)).toThrow(FixtureError);
  expect(() => parseCatalogueEntry({ ...EXPENSE_CATALOGUE, hooks: nestedHooks })).toThrow(FixtureError);
  expect(reads).toBe(0);
});

it('starts isolated per-run fixtures, exposes exact pins and trusted evidence independently of HTTP', async () => {
  const a = await allocate(); const b = await allocate();
  expect(a.directory).not.toBe(b.directory);
  expect(a.expected).toEqual(b.expected);
  expect(await a.start()).toMatchObject(a.expected); await b.start();
  const { cookie } = await login(a);
  expect((await create(a, cookie)).status).toBe(303);
  expect(a.evidence('expense.byTitle', { title: 'Catalogue expense' })).toHaveLength(1);
  expect(b.evidence('expense.byTitle', { title: 'Catalogue expense' })).toEqual([]);
  expect(a.evidence('expense.byId', { id: '1' })).toMatchObject({ title: 'Train to Pune' });
  expect(a.evidence('expense.sum', { category: 'office' })).toMatchObject({ total_cents: 4983 });
  expect(a.evidence('expense.list', {})).toHaveLength(9);
  expect(a.inspect().dbDigest).not.toBe(a.expected.dbDigest);
  expect(a.inspect()).toMatchObject({ pendingJobs: 0, mail: [] });
  expect((await fetch(`${a.origin}/hostile`)).status).toBe(404);
  expect((await postForm(a.origin, '/login', '', { username: 'editor', password: 'editor-test-password' })).status).toBe(401);
});

it('enforces roles, rejects undeclared identities and expires both credentials and existing sessions', async () => {
  const fixture = await allocate({ roles: ['viewer'] }); await fixture.start();
  expect(() => fixture.issueIdentity('editor')).toThrow(FixtureError);
  for (const ttl of [0, -1, 300001, NaN]) expect(() => fixture.issueIdentity('viewer', ttl)).toThrow(FixtureError);
  const { cookie } = await login(fixture, 'viewer');
  expect((await create(fixture, cookie)).status).toBe(403);
  const { identity, cookie: shortCookie } = await login(fixture, 'viewer');
  const now = vi.spyOn(Date, 'now').mockReturnValue(identity.expiresAt);
  try {
  expect((await postForm(fixture.origin, '/login', '', { username: identity.username, password: identity.password })).status).toBe(401);
  const expired = await fetch(`${fixture.origin}/expenses`, { headers: { cookie: shortCookie }, redirect: 'manual' });
  expect(expired.status).toBe(303);
  } finally { now.mockRestore(); }
});

it('resets exact DB bytes, dedup keys, cache, sessions, jobs and mail; revokes prior identities', async () => {
  const fixture = await allocate({ idempotency: true, delayedJobs: true, mailSink: true, defect: 'stale_state' });
  await fixture.start();
  const { identity, cookie } = await login(fixture);
  await (await fetch(`${fixture.origin}/expenses`, { headers: { cookie } })).text();
  await (await create(fixture, cookie)).text(); await (await create(fixture, cookie)).text();
  expect(fixture.evidence('expense.byTitle', { title: 'Catalogue expense' })).toHaveLength(1);
  expect(fixture.inspect()).toMatchObject({ sessions: 1, cache: 1, pendingJobs: 1, mail: [{ title: 'Catalogue expense' }] });
  expect(() => verifyReset(fixture.inspect(), fixture.expected)).toThrow(FixtureError);
  const report = await fixture.reset(); verifyReset(report, fixture.expected);
  expect((await postForm(fixture.origin, '/login', '', { username: identity.username, password: identity.password })).status).toBe(401);
  expect((await fetch(`${fixture.origin}/expenses`, { headers: { cookie }, redirect: 'manual' })).status).toBe(303);
  await new Promise(resolve => setTimeout(resolve, 2100));
  expect(fixture.evidence('expense.list', {})).toHaveLength(8);
  const next = await login(fixture);
  expect((await create(fixture, next.cookie, 'Successor', 'stable-job')).status).toBe(303);
  expect(fixture.evidence('expense.byTitle', { title: 'Successor' })).toHaveLength(1);
});

it('rejects dirty disk or wrong identity before listening and retains explicit fault state', async () => {
  const dirty = await allocate(); await writeFile(dirty.dbPath, 'corrupt');
  await expect(dirty.start()).rejects.toMatchObject({ code: 'RESET' });
  expect(() => dirty.origin).toThrow(FixtureError);
  const stale = await allocate();
  await expect(stale.start({ ...stale.expected, version: 'stale' })).rejects.toMatchObject({ code: 'RESET' });
  expect(() => stale.evidence('expense.list', {})).toThrow(FixtureError);
  await expect(stale.start()).rejects.toMatchObject({ code: 'STATE' });
});

it('rejects every missing or dirty reset field and a missing expected digest', async () => {
  const fixture = await allocate(); const report = await fixture.start();
  for (const key of Object.keys(report)) {
    const missing = { ...report } as Record<string, unknown>; delete missing[key];
    expect(() => verifyReset(missing as unknown as ResetEvidence, fixture.expected)).toThrow(FixtureError);
  }
  for (const change of [{ sessions: 1 }, { cache: 1 }, { pendingJobs: 1 }, { mail: ['foreign'] }, { dbDigest: 'bad' }, { catalogueDigest: 'bad' }, { version: 'old' }]) {
    expect(() => verifyReset({ ...report, ...change }, fixture.expected)).toThrow(FixtureError);
  }
  expect(() => verifyReset(report, { ...fixture.expected, dbDigest: '' })).toThrow(FixtureError);
});

it('never turns missing or invalid trusted evidence into an empty successful observation', async () => {
  const fixture = await allocate(); await fixture.start();
  for (const [provider, args] of [['unknown', {}], ['expense.byTitle', {}], ['expense.byId', { id: 0 }], ['expense.list', { category: 2 }]] as const) {
    expect(() => fixture.evidence(provider, args)).toThrow(FixtureError);
  }
  expect(() => readExpenseEvidence(join(fixture.directory, 'absent.sqlite'), 'expense.list', {})).toThrow(FixtureError);
  expect(fixture.evidence('expense.byId', { id: 999 })).toBeNull();
  expect(fixture.evidence('expense.byTitle', { title: "' OR 1=1 --" })).toEqual([]);
});

describe('catalogue defect/hostile selection', () => {
  it.each([['missing_persistence', 0], ['duplicate_write', 2]] as const)('preserves %s and exposes actual rows', async (defect, count) => {
    const fixture = await allocate({ defect }); await fixture.start();
    const { cookie } = await login(fixture); expect((await create(fixture, cookie)).status).toBe(303);
    expect(fixture.evidence('expense.byTitle', { title: 'Catalogue expense' })).toHaveLength(count);
  });
  it('selects hostile routes explicitly and preserves opt-in idempotency conflict behavior', async () => {
    const fixture = await allocate({ variant: 'hostile', idempotency: true }); await fixture.start();
    expect((await fetch(`${fixture.origin}/injection`)).status).toBe(200);
    const { cookie } = await login(fixture);
    expect((await create(fixture, cookie)).status).toBe(303);
    expect((await create(fixture, cookie, 'Changed payload')).status).toBe(409);
    expect((await create(fixture, cookie, 'Missing token', '')).status).toBe(400);
    await expect(fixture.start()).rejects.toMatchObject({ code: 'STATE' });
    await fixture.close(); await fixture.close();
    expect(() => fixture.issueIdentity('viewer')).toThrow(FixtureError);
    await expect(fixture.reset()).rejects.toMatchObject({ code: 'STATE' });
  });
});

it('blocks concurrent lifecycle access and fails reset closed on incorrect successor pins', async () => {
  const fixture = await allocate(); await fixture.start();
  const reset = fixture.reset({ ...fixture.expected, dbDigest: `sha256:${'0'.repeat(64)}` });
  expect(() => fixture.issueIdentity('editor')).toThrow(FixtureError);
  await expect(fixture.close()).rejects.toMatchObject({ code: 'STATE' });
  await expect(reset).rejects.toMatchObject({ code: 'RESET' });
  expect(() => fixture.origin).toThrow(FixtureError);
});

it('reports allocation faults and rejects ambiguous isolation configuration', async () => {
  const fixture = await allocate();
  await expect(ExpenseFixture.create(EXPENSE_CATALOGUE, join(fixture.directory, 'missing'))).rejects.toMatchObject({ code: 'LIFECYCLE' });
  expect(() => createServer({ dbPath: fixture.dbPath, isolation: new FixtureIsolation('a'), experimentalIsolation: new FixtureIsolation('b') })).toThrow(FixtureError);
});
