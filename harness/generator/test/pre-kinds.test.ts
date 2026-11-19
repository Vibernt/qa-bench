import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { REPO_ROOT, sha256 } from '../../../lib/io.ts';
import { generateTrack } from '../src/index.ts';

it('preserves every original exploration and regression file byte for byte', () => {
  const root = mkdtempSync(join(tmpdir(), 'qa-bench-pre-kinds-'));
  try {
    for (const track of ['exploration', 'regression']) {
      generateTrack(join(REPO_ROOT, 'tracks', `${track}.yaml`), { episodesRoot: root });
    }
    const entries = readFileSync(new URL('./fixtures/pre-kinds-episodes.sha256', import.meta.url), 'utf8').trim().split('\n');
    expect(entries).toHaveLength((17 + 24) * 2);
    for (const entry of entries) {
      const [path, digest] = entry.trim().split(/\s+/);
      expect(sha256(readFileSync(join(root, path!))), path).toBe(digest);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
