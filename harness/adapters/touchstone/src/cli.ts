import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { readData } from '../../../../lib/io.ts';
import { convertChecks, type CheckExport } from './map.ts';
const { values } = parseArgs({ options: { brief: { type: 'string' }, input: { type: 'string' }, out: { type: 'string' } } });
try {
  if (!values.brief || !values.input || !values.out) throw new Error('Required: --brief B --input check-export.json --out findings.json');
  const findings = convertChecks(readFileSync(values.brief), readData<CheckExport>(values.input));
  writeFileSync(values.out, JSON.stringify(findings, null, 2) + '\n', { flag: 'wx' });
} catch (e) { console.error((e as Error).message); process.exitCode = 1; }
