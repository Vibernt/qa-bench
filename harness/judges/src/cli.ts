import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { readData, writeJson } from '../../../lib/io.ts';
import { loadSet } from './fixtures.ts';
import { modelId } from './pricing.ts';
import { planRun, runJudge } from './run.ts';
import { judgeAgreement, judgeMarkdown, scoreJudges } from '../../../scorer/src/judges.ts';
import type { JudgeRun } from './types.ts';
import { fixturePlan } from './plan.ts';

function freshDirectory(path: string): string {
  const dir = resolve(path);
  mkdirSync(dirname(dir), { recursive: true });
  mkdirSync(dir, { recursive: false });
  return dir;
}

export async function judgeMain(argv: string[]): Promise<number> {
  const [command, ...args] = argv;
  const { values: o, positionals } = parseArgs({ args, allowPositionals: true, options: {
    manifest: { type: 'string' }, out: { type: 'string' }, model: { type: 'string' },
    'max-usd': { type: 'string' }, 'dry-run': { type: 'boolean' },
  } });
  if (command === 'plan') {
    if (!o.out) throw new Error('judge plan --out <plan.json>');
    writeJson(resolve(o.out), fixturePlan());
    console.log('Wrote 60-case recipe manifest; native rendering supplies image and evidence SHA-256s.');
    return 0;
  }
  if (command === 'generate') {
    if (!o.out) throw new Error('judge generate --out <fresh-directory>');
    // Native browser work stays in a separate executable generator, out of unit tests.
    const module = '../generator/capture.mjs';
    const { generate } = await import(module) as { generate: (dir: string) => Promise<unknown> };
    await generate(resolve(o.out));
    return 0;
  }
  if (!o.manifest) throw new Error('judge run|score requires --manifest <manifest.json>');
  if (command === 'run') {
    if (!o.model || !o['max-usd']) throw new Error('judge run requires --model and --max-usd');
    const model = modelId(o.model), cap = Number(o['max-usd']);
    const plan = planRun(o.manifest, model, cap);
    if (o['dry-run']) { console.log(JSON.stringify(plan, null, 2)); return 0; }
    if (!o.out) throw new Error('judge run requires --out <fresh-directory>');
    const dir = freshDirectory(o.out);
    const run = await runJudge(o.manifest, model, cap, join(dir, 'run.json'));
    const { set, digest } = loadSet(o.manifest);
    const score = scoreJudges(set, digest, run);
    writeJson(join(dir, 'judge-score.json'), score);
    writeFileSync(join(dir, 'judge-report.md'), judgeMarkdown([score]));
    console.log(judgeMarkdown([score]));
    return run.status === 'complete' ? 0 : 1;
  }
  if (command === 'score') {
    if (!positionals.length || !o.out) throw new Error('judge score <run.json…> --manifest M --out <fresh-directory>');
    const { set, digest } = loadSet(o.manifest);
    const runs = positionals.map(f => readData<JudgeRun>(f));
    const scores = runs.map(r => scoreJudges(set, digest, r));
    const dir = freshDirectory(o.out);
    writeJson(join(dir, 'judge-score.json'), scores);
    writeFileSync(join(dir, 'judge-report.md'), judgeMarkdown(scores));
    writeJson(join(dir, 'agreement.json'), runs.flatMap((a, i) => runs.slice(i + 1).map(b => judgeAgreement(a, b))));
    console.log(judgeMarkdown(scores));
    return 0;
  }
  throw new Error('judge commands: plan, generate, run, score');
}
