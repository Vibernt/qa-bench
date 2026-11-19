import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';

// Only structural browser doubles: no launch, listener, socket or target app is used.
const browserMock = vi.hoisted(() => ({ launch: vi.fn() }));
vi.mock('playwright', () => ({ chromium: { launch: browserMock.launch } }));
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
it('exports blocked sign-ins, skips their private pages, checks other roles, and closes every context', async () => {
  const root = mkdtempSync(join(tmpdir(), 'qa-bench-native-')); dirs.push(root);
  const dist = join(root, 'packages/checks/dist'); mkdirSync(dist, { recursive: true });
  writeFileSync(join(root, 'packages/checks/package.json'), JSON.stringify({ type: 'module', version: 'test' }));
  // Operator-owned check package double; does not load a real installed system.
  writeFileSync(join(dist, 'index.js'), `
    export const CHECK_VIEWPORTS = { desktop: { width: 1280, height: 720 }, mobile: { width: 390, height: 844 } };
    export const CheckCollector = { install: async () => ({ record() {}, checkpoint: async () => ({ findings: [] }) }) };
  `);
  const brief = { episode_id: 'test-001', bench_version: 'test', app: 'test', track: 'visual',
    targets: [{ name: 'app', url: 'http://127.0.0.1:1234/login' }], pages: ['/private'],
    roles: ['blocked', 'working'].map(role => ({ role, accounts: [{ username: role + '-user', password: role + '-password' }] })),
    budget: { wall_time_s: 60 } };
  const briefPath = join(root, 'brief.json'); const out = join(root, 'findings.json');
  writeFileSync(briefPath, JSON.stringify(brief));
  const contexts: { goto: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }[] = [];
  const browser = { close: vi.fn(), newContext: vi.fn(async () => {
    const blocked = contexts.length < 2;
    let submitted = false; let url = brief.targets[0]!.url;
    const goto = vi.fn(async (next: string) => { url = next; });
    const close = vi.fn(); contexts.push({ goto, close });
    const page = { goto, url: () => url, on: vi.fn(), evaluate: vi.fn(), addInitScript: vi.fn(), addScriptTag: vi.fn(), waitForLoadState: vi.fn(),
      locator: (selector: string) => {
        if (selector === 'input[type=password]') return { count: async () => submitted && !blocked ? 0 : 1, fill: vi.fn() };
        if (selector.startsWith('input[name=username]')) return { count: async () => 1, fill: vi.fn() };
        if (selector.startsWith('button[type=submit]')) return { count: async () => 1, click: async () => { submitted = true; } };
        return { count: async () => 1, nth: () => ({ isVisible: async () => true, innerText: async () => 'Rejected blocked-user blocked-password' }) };
      } };
    return { close, route: vi.fn(), newPage: async () => page };
  }) };
  browserMock.launch.mockResolvedValue(browser);
  const modulePath = '../native.mjs';
  const { nativeChecks } = await import(modulePath);
  const result = await nativeChecks({ root, briefPath, out });
  expect(result.findings).toHaveLength(2);
  expect(result.findings.every((f: { where: { role: string }; category: string }) => f.where.role === 'blocked' && f.category === 'functional')).toBe(true);
  expect(contexts.map(c => c.goto.mock.calls.map(([url]) => new URL(url).pathname))).toEqual([
    ['/login'], ['/login'], ['/login', '/private'], ['/login', '/private'],
  ]);
  for (const context of contexts) expect(context.close).toHaveBeenCalledOnce();
  expect(browser.close).toHaveBeenCalledOnce();
  const exported = readFileSync(out + '.checks.json', 'utf8');
  expect(exported).not.toContain('blocked-password'); expect(exported).not.toContain('blocked-user');
  expect(JSON.parse(exported).observations).toHaveLength(4);
});
