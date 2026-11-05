// Entry point inside the adapter container: read /bench/brief/brief.json, run, write /bench/out/findings.json.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { httpApi } from './client.ts';
import { runAdapter } from './run.ts';
import type { Brief } from './types.ts';

const briefPath = process.env.QA_BENCH_BRIEF ?? '/bench/brief/brief.json';
let brief: Brief;
try {
  brief = JSON.parse(readFileSync(briefPath, 'utf8')) as Brief;
} catch (e) {
  console.error(`http-api adapter: cannot read the brief at ${briefPath}: ${(e as Error).message}`);
  process.exit(2);
}
const out = brief.out?.findings ?? '/bench/out/findings.json';

const result = await runAdapter(brief, {
  apiUrl: process.env.QA_SYSTEM_API_URL,
  token: process.env.QA_SYSTEM_API_TOKEN,
  project: process.env.QA_SYSTEM_PROJECT,
  approved: process.env.QA_BENCH_REMOTE_APPROVED === '1',
  ...(process.env.QA_SYSTEM_NAME ? { system: { name: process.env.QA_SYSTEM_NAME, version: process.env.QA_SYSTEM_VERSION ?? 'unknown' } } : {}),
  makeApi: httpApi,
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(result.findings, null, 2) + '\n');
console.log(`http-api adapter: ${result.findings.findings.length} finding(s); ${result.findings.notes ?? ''}`);
process.exit(result.ok ? 0 : 1);
