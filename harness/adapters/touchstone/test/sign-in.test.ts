import { expect, it, vi } from 'vitest';
import type { Page } from 'playwright';
import type { Brief } from '../../../../lib/contracts.ts';
import { sha256 } from '../../../../lib/io.ts';
import { signIn } from '../src/sign-in.ts';
import { convertChecks } from '../src/map.ts';

const account = { username: 'test-user', password: 'test-password' };
const brief: Brief = { episode_id: 'test-001', bench_version: 'test', app: 'test', track: 'visual',
  targets: [{ name: 'app', url: 'http://127.0.0.1:1234' }], roles: [{ role: 'editor', accounts: [account] }],
  budget: { wall_time_s: 60 } };
const viewport = { width: 390, height: 844, mobile: true };
function mockPage(opts: { success?: boolean; passwords?: number; users?: number; submits?: number; clickError?: boolean } = {}) {
  let submitted = false;
  const fill = vi.fn();
  const click = vi.fn(async () => { if (opts.clickError) throw new Error('Click failed'); submitted = true; });
  const errors = [
    { isVisible: async () => true, innerText: async () => `Rejected ${account.username}: ${account.password}` },
    { isVisible: async () => false, innerText: vi.fn(async () => 'Hidden error') },
  ];
  const page = { locator: (selector: string) => {
    if (selector === 'input[type=password]') return { count: async () => submitted && opts.success ? 0 : opts.passwords ?? 1, fill };
    if (selector.startsWith('input[name=username]')) return { count: async () => opts.users ?? 1, fill };
    if (selector.startsWith('button[type=submit]')) return { count: async () => opts.submits ?? 1, click };
    return { count: async () => errors.length, nth: (i: number) => errors[i] };
  }, waitForLoadState: vi.fn() } as unknown as Page;
  return { page, click, fill, errors };
}
it('emits a schema-valid role-specific blocked core-flow finding with only redacted visible errors', async () => {
  const { page, errors } = mockPage();
  const finding = await signIn(page, account, brief, viewport);
  expect(finding).toMatchObject({ kind: 'functional', severity: 'critical', rule: 'sign-in-incomplete' });
  expect(finding!.message).toContain('Sign-in did not complete');
  expect(finding!.message).toContain('Rejected [masked]: [masked]');
  expect(errors[1]!.innerText).not.toHaveBeenCalled();
  const bytes = Buffer.from(JSON.stringify(brief));
  const mapped = convertChecks(bytes, { schema: 'qa-bench.check-export/v1', episode_id: brief.episode_id,
    brief_sha256: sha256(bytes), status: 'complete', system: { name: 'test', version: '1' },
    wall_time_s: 1, cost: { model_usd: 0, notes: 'local' }, observations: [
      { page: brief.targets[0]!.url + '/login', role: 'editor', findings: [finding!] },
    ] });
  expect(mapped.findings[0]).toMatchObject({ category: 'functional', severity: 'critical', where: { route: '/login', role: 'editor' } });
  expect(JSON.stringify(mapped)).not.toContain(account.password);
  expect(JSON.stringify(finding)).not.toContain(account.username);
});
it('allows successful sign-in and pages without a credential form', async () => {
  expect(await signIn(mockPage({ success: true }).page, account, brief, viewport)).toBeUndefined();
  const { page, click } = mockPage({ passwords: 0 });
  expect(await signIn(page, undefined, brief, viewport)).toBeUndefined();
  expect(click).not.toHaveBeenCalled();
});
it.each([{ passwords: 2 }, { users: 0 }, { users: 2 }, { submits: 0 }, { submits: 2 }])('rejects unsupported form shape %j before submitting', async opts => {
  const { page, click, fill } = mockPage(opts);
  await expect(signIn(page, account, brief, viewport)).rejects.toThrow('Unsupported sign-in form shape');
  expect(click).not.toHaveBeenCalled();
  expect(fill).not.toHaveBeenCalled();
});
it('keeps missing credentials and automation errors explicit', async () => {
  await expect(signIn(mockPage().page, undefined, brief, viewport)).rejects.toThrow('without a brief account');
  await expect(signIn(mockPage({ clickError: true }).page, account, brief, viewport)).rejects.toThrow('Click failed');
});
it('reports absent visible error text honestly', async () => {
  const { page, errors } = mockPage();
  errors.splice(0);
  expect((await signIn(page, account, brief, viewport))!.message).toContain('No visible error text was observed');
});
