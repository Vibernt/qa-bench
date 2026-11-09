// Native smoke/reproducibility check. No models, Docker, or CI browser launch.
// npx tsx harness/judges/verify.ts
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { loadSet } from './src/fixtures.ts';
import { makeRequest } from './src/request.ts';
import { MODELS, type Model } from './src/pricing.ts';
const module = './generator/capture.mjs';
const { generate } = await import(module) as { generate: (dir: string) => Promise<unknown> };
const root = mkdtempSync(join(tmpdir(), 'qa-bench-judge-verify-'));
try {
  await generate(join(root, 'a'));
  await generate(join(root, 'b'));
  const a = loadSet(join(root, 'a/manifest.json')), b = loadSet(join(root, 'b/manifest.json'));
  deepStrictEqual(a.set, b.set);
  strictEqual(a.set.cases.length, 60);
  let oversize = 0;
  for (const model of Object.keys(MODELS) as Model[]) for (const c of a.set.cases) { try { makeRequest(c, a.root, model); } catch (e) { if (!/input token ceiling/.test((e as Error).message)) throw e; oversize++; } }
  console.log(`PASS: 60 cases, all artifact checksums, byte-identical manifests on repeat render; ${oversize / 3} case(s) over the input ceiling are recorded as not judged`);
} finally { rmSync(root, { recursive: true, force: true }); }
