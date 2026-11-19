import { afterEach, describe, expect, it } from 'vitest';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { recipes } from '../src/catalogue.ts';
import { artifactBytes, loadSet } from '../src/fixtures.ts';
import { makeRequest } from '../src/request.ts';
import { fixtureSet } from './helpers.ts';
import { fixturePlan, loadPlan } from '../src/plan.ts';
import { REPO_ROOT } from '../../../lib/io.ts';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })));
describe('judge generator contract', () => {
  it('is reproducible, balanced, covers three apps and all seven expense faults', () => {
    const rows = recipes();
    expect(rows).toEqual(recipes());
    expect(rows).toHaveLength(60);
    expect(rows.filter(c => c.label === 'problem')).toHaveLength(30);
    expect(new Set(rows.map(c => c.app)).size).toBe(3);
    expect(new Set(rows.map(c => c.kind)).size).toBe(3);
    expect(new Set(rows.filter(c => c.app === 'expense-app' && c.fault).map(c => c.fault)).size).toBe(7);
    expect(rows.filter(c => c.twin_of)).toHaveLength(12);
    for (const twin of rows.filter(c => c.twin_of)) {
      const problem = rows.find(c => c.id === twin.twin_of)!;
      expect([problem.group, problem.variant, problem.width]).toEqual([twin.group, twin.variant, twin.width]);
      expect(problem.label).toBe('problem'); expect(twin.label).toBe('ok');
    }
  });
  it('pins recipe and source bytes reproducibly without browsers or network', () => {
    const plan = fixturePlan();
    expect(plan).toEqual(fixturePlan());
    expect(plan.cases).toHaveLength(60);
    expect(plan.sources.length).toBeGreaterThan(10);
    expect(plan.sources.every(s => /^[a-f0-9]{64}$/.test(s.sha256))).toBe(true);
    expect(plan.sources.some(s => /node_modules|\/build\//.test(s.path))).toBe(false);
  });
  it('the checked-in judge-sets/visual-v1/plan.json matches the current sources (regenerate with `judge plan`)', () => {
    // loadPlan refuses a stale plan, so a stale checked-in plan breaks every documented dry run.
    expect(() => loadPlan(join(REPO_ROOT, 'judge-sets', 'visual-v1', 'plan.json'))).not.toThrow();
  });
  it('validates all SHA-256s and refuses changed bytes or escaping paths', () => {
    const f = fixtureSet(); dirs.push(f.root);
    expect(loadSet(f.manifest).digest).toBe(f.digest);
    expect(() => artifactBytes(f.root, { path: '../outside', sha256: '0'.repeat(64) })).toThrow();
    writeFileSync(join(f.root, 'page.png'), 'tampered');
    expect(() => loadSet(f.manifest)).toThrow('checksum');
  });
  it('sends only evidence, never answer metadata; rejects oversized evidence before calls', () => {
    const f = fixtureSet(); dirs.push(f.root);
    const c = { ...f.set.cases[0]!, defect_id: 'SEALED_DEFECT', group: 'SEALED_GROUP', twin_of: 'SEALED_TWIN' };
    const request = makeRequest(c, f.root, 'claude-haiku-5-5');
    expect(JSON.stringify(request)).not.toContain('SEALED');
    expect(JSON.stringify(request)).not.toContain('page.png');
    const { screenshot } = c;
    const png = Buffer.alloc(24); Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
    png.writeUInt32BE(8000, 16); png.writeUInt32BE(1, 20);
    writeFileSync(join(f.root, screenshot.path), png);
    expect(() => makeRequest(c, f.root, 'claude-haiku-5-5')).toThrow();
  });
});
