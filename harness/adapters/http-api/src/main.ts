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
  console.error(`touchstone adapter: cannot read the brief at ${briefPath}: ${(e as Error).message}`);
  process.exit(2);
}
const out = brief.out?.findings ?? '/bench/out/findings.json';

const result = await runAdapter(brief, {
  apiUrl: process.env.TOUCHSTONE_API_URL,
  token: process.env.TOUCHSTONE_API_TOKEN,
  project: process.env.TOUCHSTONE_PROJECT,
  approved: process.env.QA_BENCH_TOUCHSTONE_APPROVED === '1',
  makeApi: httpApi,
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(result.findings, null, 2) + '\n');
console.log(`touchstone adapter: ${result.findings.findings.length} finding(s); ${result.findings.notes ?? ''}`);
process.exit(result.ok ? 0 : 1);
