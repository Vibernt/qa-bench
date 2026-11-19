import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { nativeHunt, HuntFailure } from '../src/native.ts';
import { brief, options, result, usage, digest } from './fixtures.ts';
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'qa-bench-hunt-')); dirs.push(dir);
  const opts = options(dir); const b = brief();
  mkdirSync(join(opts.root, 'tools/huntbench'), { recursive: true });
  writeFileSync(join(opts.root, 'tools/huntbench/run.mjs'), '// injected process only');
  writeFileSync(opts.briefPath, JSON.stringify(b));
  const execute = vi.fn(async (args: string[], _cwd: string, _timeoutMs: number) => {
    if (!args.includes('--live')) return { code: 0, stdout: JSON.stringify({ schema: 'cri.huntbench-plan/v1', digest, worstCaseUSD: 0.208, mission: { origin: 'http://127.0.0.1:1234' } }), stderr: '' };
    const artifacts = args[args.indexOf('--out') + 1]!; mkdirSync(artifacts, { recursive: true });
    const data = result(); data.observations![0]!.role = (args[args.indexOf('--role') + 1] ?? '').split('=')[0]!;
    for (const [name, value] of Object.entries({ 'result.json': data, 'triage.json': {}, 'usage.json': usage(), 'overhead.json': { browserLaunches: 2 } })) writeFileSync(join(artifacts, name), JSON.stringify(value));
    return { code: 0, stdout: '', stderr: '' };
  });
  return { dir, opts, b, execute };
}
it('plan-only calls CLI once, retains private plan and zero cost, and emits no findings', async () => {
  const f = fixture(); const output = await nativeHunt(f.opts, { execute: f.execute });
  expect(output).toMatchObject({ planOnly: true, cost: { model_usd: 0, calls: 0, tokens: 0 } });
  expect(f.execute).toHaveBeenCalledOnce(); expect(existsSync(f.opts.out)).toBe(false);
  expect(existsSync(f.opts.out + '.hunt/plan.json')).toBe(true);
  expect(statSync(f.opts.out + '.hunt/brief.json').mode & 0o777).toBe(0o600);
  expect(f.execute.mock.calls[0]![0]).not.toContain('--live');
});
it('aliases a role only when its name contains a credential literal, and restores it in findings', async () => {
  const f = fixture(); f.opts.live = true;
  f.b.roles[0]!.accounts[0]!.username = f.b.roles[0]!.role; writeFileSync(f.opts.briefPath, JSON.stringify(f.b));
  const output = await nativeHunt(f.opts, { execute: f.execute });
  const args = f.execute.mock.calls[0]![0];
  expect(args.slice(args.indexOf('--role'), args.indexOf('--role') + 2)).toEqual(['--role', 'benchRole1=@brief']);
  // The role name is itself an account string here, so the privacy pass masks it in the published finding.
  expect(output.findings!.findings[0]!.where.role).toBe('[masked]');
});
it('runs plan then exact printed digest with fixed capped arguments and keeps the brief role name', async () => {
  const f = fixture(); f.opts.live = true;
  const output = await nativeHunt(f.opts, { execute: f.execute });
  expect(f.execute).toHaveBeenCalledTimes(2);
  const [args, cwd, timeout] = f.execute.mock.calls[0]!;
  expect(f.execute.mock.calls[1]![0]).toEqual([...args, '--approve-digest', digest, '--live']);
  expect(cwd).toBe(f.opts.out + '.hunt'); expect(timeout).toBe(90000);
  for (const pair of [['--max-usd', '1'], ['--max-calls', '40'], ['--role', 'editor=@brief'], ['--wall-s', '60']]) expect(args.slice(args.indexOf(pair[0]!), args.indexOf(pair[0]!) + 2)).toEqual(pair);
  expect(args).toContain('--approve-writes'); expect(output.findings!.findings[0]!.where.role).toBe('editor');
  expect(output.cost).toMatchObject({ model_usd: 0.01, calls: 2, tokens: 40 });
  expect(readFileSync(f.opts.out, 'utf8')).not.toContain('private-');
  expect(statSync(f.opts.out).mode & 0o777).toBe(0o600);
});
it.each(['https://example.test/', 'http://127.0.0.1.example.test/', 'file:///tmp/a', 'http://user:pass@localhost/'])('refuses target %s before invoking a process', async url => {
  const f = fixture(); f.b.targets[0]!.url = url; writeFileSync(f.opts.briefPath, JSON.stringify(f.b));
  await expect(nativeHunt(f.opts, { execute: f.execute })).rejects.toThrow(); expect(f.execute).not.toHaveBeenCalled();
});
it.each(['http://localhost:1234/', 'http://[::1]:1234/'])('accepts exact loopback %s', async url => {
  const f = fixture(); f.b.targets[0]!.url = url; writeFileSync(f.opts.briefPath, JSON.stringify(f.b));
  f.execute.mockResolvedValue({ code: 0, stdout: JSON.stringify({ schema: 'cri.huntbench-plan/v1', digest, worstCaseUSD: 0.208, mission: { origin: new URL(url).origin } }), stderr: '' });
  await expect(nativeHunt(f.opts, { execute: f.execute })).resolves.toMatchObject({ planOnly: true });
});
it('refuses multi-origin, missing accounts and unsupported brief rules without process calls', async () => {
  for (const change of [(b: ReturnType<typeof brief>) => b.targets.push({ name: 'other', url: 'http://localhost:4321' }),
    (b: ReturnType<typeof brief>) => { b.roles[0]!.accounts = []; },
    (b: ReturnType<typeof brief>) => { b.rules = { forms: false }; }]) {
    const f = fixture(); change(f.b); writeFileSync(f.opts.briefPath, JSON.stringify(f.b));
    await expect(nativeHunt(f.opts, { execute: f.execute })).rejects.toThrow(); expect(f.execute).not.toHaveBeenCalled();
  }
});
it('honours the lower brief money cap and refuses oversized live reservation', async () => {
  const f = fixture(); f.opts.live = true; f.b.budget.money_usd = 0.1; writeFileSync(f.opts.briefPath, JSON.stringify(f.b));
  await expect(nativeHunt(f.opts, { execute: f.execute })).rejects.toMatchObject({ cost: { model_usd: 0 } });
  expect(f.execute).toHaveBeenCalledOnce(); const args = f.execute.mock.calls[0]![0]; expect(args[args.indexOf('--max-usd') + 1]).toBe('0.1');
});
it('rejects stale digest output and retains paid usage when mapping fails', async () => {
  const f = fixture(); f.opts.live = true;
  const real = f.execute.getMockImplementation()!;
  f.execute.mockImplementation(async (...args) => {
    const response = await real(...args);
    if (args[0].includes('--live')) {
      const path = f.opts.out + '.hunt/artifacts/result.json'; const data = result(); data.missionDigest = 'sha256:' + 'b'.repeat(64); writeFileSync(path, JSON.stringify(data));
    }
    return response;
  });
  await expect(nativeHunt(f.opts, { execute: f.execute })).rejects.toMatchObject({ message: 'Result digest differs from approved plan', cost: { model_usd: 0.01, calls: 2 } });
});
it('retains unknown spend after failed live invocation and redacts its error', async () => {
  const f = fixture(); f.opts.live = true;
  f.execute.mockResolvedValueOnce({ code: 0, stdout: JSON.stringify({ schema: 'cri.huntbench-plan/v1', digest, worstCaseUSD: 0.208, mission: { origin: 'http://127.0.0.1:1234' } }), stderr: '' })
    .mockResolvedValueOnce({ code: 3, stdout: '', stderr: 'private-user private-password /Users/someone/checkout' });
  const error = await nativeHunt(f.opts, { execute: f.execute }).catch(e => e as HuntFailure);
  expect(error).toMatchObject({ cost: { model_usd: null, calls: null } }); expect(String(error)).not.toContain('private-user'); expect(String(error)).not.toContain('private-password'); expect(String(error)).not.toContain('/Users/');
});
it('refuses existing output and malformed printed plans', async () => {
  const f = fixture(); mkdirSync(dirname(f.opts.out), { recursive: true }); writeFileSync(f.opts.out, '{}');
  await expect(nativeHunt(f.opts, { execute: f.execute })).rejects.toThrow('Output exists'); expect(f.execute).not.toHaveBeenCalled();
  const g = fixture(); g.execute.mockResolvedValue({ code: 0, stdout: '{}', stderr: '' });
  await expect(nativeHunt(g.opts, { execute: g.execute })).rejects.toThrow('Invalid printed');
});
it.each(['https://example.test/app', 'http://127.0.0.2/app', 'http://localhost.example.test/app', 'file:///tmp/app', 'http://user:password@localhost/app'])('refuses non-loopback/credential target %s before CLI', async url => {
  const f = fixture(); f.b.targets[0]!.url = url; writeFileSync(f.opts.briefPath, JSON.stringify(f.b));
  await expect(nativeHunt(f.opts, { execute: f.execute })).rejects.toThrow(); expect(f.execute).not.toHaveBeenCalled();
});
it.each(['http://localhost:1234/', 'http://[::1]:1234/'])('accepts exact loopback %s', async url => {
  const f = fixture(); f.b.targets[0]!.url = url; writeFileSync(f.opts.briefPath, JSON.stringify(f.b));
  f.execute.mockResolvedValue({ code: 0, stdout: JSON.stringify({ schema: 'cri.huntbench-plan/v1', digest, worstCaseUSD: 0.208, mission: { origin: new URL(url).origin } }), stderr: '' });
  expect((await nativeHunt(f.opts, { execute: f.execute })).planOnly).toBe(true);
});
it('refuses multi-origin briefs, empty roles, multiple accounts and unsupported rules explicitly', async () => {
  for (const edit of [
    (b: ReturnType<typeof brief>) => { b.targets.push({ name: 'other', url: 'http://localhost:1234/' }); },
    (b: ReturnType<typeof brief>) => { b.roles = []; },
    (b: ReturnType<typeof brief>) => { b.roles[0]!.accounts.push({ username: 'second', password: 'second-secret' }); },
    (b: ReturnType<typeof brief>) => { b.rules = { forms: false }; },
  ]) { const f = fixture(); edit(f.b); writeFileSync(f.opts.briefPath, JSON.stringify(f.b)); await expect(nativeHunt(f.opts, { execute: f.execute })).rejects.toThrow(); expect(f.execute).not.toHaveBeenCalled(); }
});
it('keeps zero model cost for failed plans and records known usage on nonzero live exit', async () => {
  const f = fixture(); f.opts.live = true; f.execute.mockResolvedValue({ code: 2, stdout: '', stderr: 'HUNT_SIGN_IN_REJECTED' });
  await expect(nativeHunt(f.opts, { execute: f.execute })).rejects.toMatchObject({ cost: { model_usd: 0, calls: 0 } });
  const g = fixture(); g.opts.live = true; const real = g.execute.getMockImplementation()!;
  g.execute.mockImplementation(async (...args) => { const response = await real(...args); return args[0].includes('--live') ? { ...response, code: 2, stderr: 'HUNT_FAILED' } : response; });
  await expect(nativeHunt(g.opts, { execute: g.execute })).rejects.toMatchObject({ cost: { model_usd: 0.01, calls: 2, tokens: 40 } });
});
it('keeps what a hunt recorded before it stopped early (exit 3 with a result and clean teardown)', async () => {
  const g = fixture(); g.opts.live = true; const real = g.execute.getMockImplementation()!;
  g.execute.mockImplementation(async (...args) => {
    const response = await real(...args);
    if (!args[0].includes('--live')) return response;
    const path = join(args[0][args[0].indexOf('--out') + 1]!, 'result.json');
    writeFileSync(path, JSON.stringify({ ...JSON.parse(readFileSync(path, 'utf8')), status: 'incomplete', stopReason: 'MODEL_CONFIGURATION' }));
    return { ...response, code: 3, stderr: '' };
  });
  const output = await nativeHunt(g.opts, { execute: g.execute });
  expect(output.findings!.findings.length).toBeGreaterThan(0);
  expect(output.findings!.notes).toContain('Hunt stopped early (MODEL_CONFIGURATION)');
});
it('refuses writes into the read-only operator checkout', async () => {
  const f = fixture(); f.opts.out = join(f.opts.root, 'results/findings.json');
  await expect(nativeHunt(f.opts, { execute: f.execute })).rejects.toThrow('read-only'); expect(f.execute).not.toHaveBeenCalled();
});
