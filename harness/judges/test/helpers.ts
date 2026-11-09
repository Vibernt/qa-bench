import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sha256, writeJson } from '../../../lib/io.ts';
import type { JudgeCase, JudgeEvidence, JudgeSet } from '../src/types.ts';

export function fixtureSet(count = 2) {
  const root = mkdtempSync(join(tmpdir(), 'qa-bench-judge-test-'));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
  writeFileSync(join(root, 'page.png'), png);
  const image = { path: 'page.png', sha256: sha256(png) };
  const evidence: JudgeEvidence = { page: '/test', text: 'Save', a11yTree: 'button Save', context: {},
    masking: { version: 'bench-masks/v1', selectors: [], known_secrets: true } };
  const bytes = writeJson(join(root, 'page.json'), evidence);
  const cases: JudgeCase[] = Array.from({ length: count }, (_, i) => ({ id: `case-${i + 1}`, app: 'test', group: 'test',
    kind: 'visual-defect', label: i % 2 ? 'ok' : 'problem', defect_id: i % 2 ? null : 'test.defect',
    change_id: i % 2 ? 'test.change' : null, twin_of: i % 2 ? `case-${i}` : null,
    baseline: image, screenshot: image, evidence: { path: 'page.json', sha256: sha256(bytes) } }));
  const set: JudgeSet = { schema: 'qa-bench.judge-set/v1', track: '7.9', generator: 'test', source_sha256: sha256('test'),
    environment: { node: 'test', browser: 'test', platform: 'test' }, cases };
  const manifest = join(root, 'manifest.json');
  const digest = sha256(writeJson(manifest, set));
  return { root, manifest, digest, set };
}
