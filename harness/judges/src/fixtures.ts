import { readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { sha256 } from '../../../lib/io.ts';
import type { Artifact, JudgeEvidence, JudgeSet } from './types.ts';

export function artifactBytes(root: string, file: Artifact): Buffer {
  if (!file || !/^[a-f0-9]{64}$/.test(file.sha256) || typeof file.path !== 'string') throw new Error('Invalid artifact reference');
  const full = realpathSync(resolve(root, file.path));
  const rel = relative(realpathSync(root), full);
  if (!rel || rel.startsWith('..') || isAbsolute(file.path) || isAbsolute(rel)) throw new Error('Artifact escapes fixture root');
  const bytes = readFileSync(full);
  if (sha256(bytes) !== file.sha256) throw new Error(`Artifact checksum mismatch: ${file.path}`);
  return bytes;
}
export function loadSet(path: string): { set: JudgeSet; root: string; digest: string } {
  const bytes = readFileSync(path);
  const set = JSON.parse(bytes.toString()) as JudgeSet;
  if (set.schema !== 'qa-bench.judge-set/v1' || set.track !== '7.9' || !Array.isArray(set.cases) || !set.cases.length) throw new Error('Invalid judge manifest');
  const ids = new Set<string>();
  const root = dirname(resolve(path));
  for (const c of set.cases) {
    if (!/^case-\d+$/.test(c.id) || ids.has(c.id) || !['ok', 'problem'].includes(c.label) ||
      !['visual-defect', 'intended-change', 'a11y'].includes(c.kind) || !c.group ||
      (c.label === 'problem' && !c.defect_id)) throw new Error('Invalid or duplicate judge case');
    ids.add(c.id);
    for (const a of [c.screenshot, c.baseline, c.evidence]) artifactBytes(root, a);
    readEvidence(root, c.evidence);
  }
  for (const c of set.cases) if (c.twin_of && (c.label !== 'ok' || !set.cases.some(p => p.id === c.twin_of && p.label === 'problem'))) throw new Error('Invalid twin');
  return { set, root, digest: sha256(bytes) };
}
export function readEvidence(root: string, artifact: Artifact): JudgeEvidence {
  const value = JSON.parse(artifactBytes(root, artifact).toString()) as JudgeEvidence;
  if (typeof value.text !== 'string' || typeof value.a11yTree !== 'string' || typeof value.page !== 'string' ||
    !value.context || value.masking?.version !== 'bench-masks/v1' || value.masking.known_secrets !== true ||
    !Array.isArray(value.masking.selectors)) throw new Error('Invalid masked evidence');
  return value;
}
