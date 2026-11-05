import { resolve } from 'node:path';
import { renderMarkdown } from './report.ts';
import { scoreRun } from './run.ts';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: npx tsx scorer/src/cli.ts <runDir> [--episodes <root>]');
  process.exit(2);
}
const i = process.argv.indexOf('--episodes');
const episodesRoot = i > 0 ? resolve(process.argv[i + 1] ?? '') : undefined;
console.log(renderMarkdown(scoreRun(resolve(dir), { episodesRoot })));
