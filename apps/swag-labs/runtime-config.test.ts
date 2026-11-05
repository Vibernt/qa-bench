// Unit test (no docker, no browser): bench/runtime-config.sh and upstream/src/utils/QaBench.js agree on the names and
// bit flags of every mutation and change, every label's switch value is a known name, and the script encodes the env
// as the page expects and refuses unknown names.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, 'bench', 'runtime-config.sh');
const shText = readFileSync(script, 'utf8');
const jsText = readFileSync(join(here, 'upstream', 'src', 'utils', 'QaBench.js'), 'utf8');

/** `name) bit=N ;;` lines of one `for` loop in the shell script, keyed by the env var it reads. */
function shBits(envVar: string): Record<string, number> {
  const loop = shText.split(`\${${envVar}:-}`)[1]!.split('done')[0]!;
  return Object.fromEntries([...loop.matchAll(/^\s*([a-z_-]+)\) bit=(\d+) ;;/gm)].map((m) => [m[1]!, Number(m[2])]));
}
/** `name: N,` entries of one const object in QaBench.js. */
function jsBits(constName: string): Record<string, number> {
  const body = jsText.split(`const ${constName} = {`)[1]!.split('};')[0]!;
  return Object.fromEntries([...body.matchAll(/^\s*"?([a-z_-]+)"?: (\d+),/gm)].map((m) => [m[1]!, Number(m[2])]));
}
function run(env: Record<string, string>): { status: number | null; out?: string; stderr: string } {
  const out = join(mkdtempSync(join(tmpdir(), 'swag-rt-')), 'runtime-config.js');
  const r = spawnSync('sh', [script], { env: { PATH: process.env.PATH, QA_BENCH_RUNTIME_OUT: out, ...env }, encoding: 'utf8' });
  return { status: r.status, stderr: r.stderr, out: r.status === 0 ? readFileSync(out, 'utf8') : undefined };
}
function labelValues(kind: string, envVar: string): string[] {
  return readdirSync(join(here, kind)).map((d) => YAML.parse(readFileSync(join(here, kind, d, 'label.yaml'), 'utf8')).switch.env[envVar] as string);
}

describe('swag-labs runtime config', () => {
  const mutations = shBits('QA_BENCH_MUTATIONS');
  const changes = shBits('QA_BENCH_CHANGES');

  it('uses the same names and bits in the shell script and the page', () => {
    expect(mutations).toEqual(jsBits('MUTATION_BITS'));
    expect(changes).toEqual(jsBits('CHANGE_BITS'));
    expect(Object.keys(mutations).sort()).toEqual(['error_user', 'locked_out_user', 'performance_glitch_user', 'problem_user', 'visual_user']);
  });

  it('has a label for every name, and every label switch is a known name', () => {
    expect(labelValues('mutations', 'QA_BENCH_MUTATIONS').sort()).toEqual(Object.keys(mutations).sort());
    expect(labelValues('changes', 'QA_BENCH_CHANGES').sort()).toEqual(Object.keys(changes).sort());
  });

  it('encodes accounts, mutations and changes', () => {
    const r = run({ QA_BENCH_ACCOUNTS: 'customer-a:pw-a', QA_BENCH_MUTATIONS: 'problem_user,visual_user', QA_BENCH_CHANGES: 'relabel, price-change' });
    expect(r.status).toBe(0);
    const m = r.out!.match(/window\.__SL_RUNTIME__ = \{ a: "([^"]*)", m: (\d+), c: (\d+) \};/);
    expect(m).not.toBeNull();
    expect(Buffer.from(m![1]!, 'base64').toString()).toBe('customer-a:pw-a');
    expect(Number(m![2])).toBe(mutations.problem_user! | mutations.visual_user!);
    expect(Number(m![3])).toBe(changes.relabel! | changes['price-change']!);
    expect(r.out).not.toMatch(/problem_user|visual_user|relabel/);
  });

  it('writes an empty config when nothing is set (upstream behaviour)', () => {
    expect(run({}).out).toContain('{ a: "", m: 0, c: 0 }');
  });

  it('refuses unknown names', () => {
    const r = run({ QA_BENCH_MUTATIONS: 'standard_user' });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("unknown QA_BENCH_MUTATIONS value 'standard_user'");
    expect(run({ QA_BENCH_CHANGES: 'nope' }).status).not.toBe(0);
  });

  it('is valid POSIX sh', () => {
    expect(() => execFileSync('sh', ['-n', script])).not.toThrow();
  });
});
