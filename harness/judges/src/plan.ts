import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO_ROOT, sha256, readData } from '../../../lib/io.ts';
import { recipes } from './catalogue.ts';

/** Source inputs are pinned before rendering; image/evidence SHA-256s are emitted by the native build. */
export function fixturePlan(root = REPO_ROOT) {
  const files: string[] = [];
  function visit(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', 'build', '.git'].includes(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (/\.(ts|mjs|js|jsx|css|json|sql|html)$/.test(path)) files.push(path);
    }
  }
  for (const dir of ['harness/judges', 'apps/expense-app/app', 'apps/survey-site/app', 'apps/swag-labs/upstream']) visit(join(root, dir));
  const sources = files.sort().map(path => ({ path: relative(root, path), sha256: sha256(readFileSync(path)) }));
  return { schema: 'qa-bench.judge-plan/v1', track: '7.9', generator: 'bench-render/v1',
    status: 'requires-native-render', seed: 'judge-fixture/v1', source_sha256: sha256(JSON.stringify(sources)), sources,
    cases: recipes().map(recipe => ({ ...recipe, recipe_sha256: sha256(JSON.stringify(recipe)),
      outputs: [`${recipe.id}-before.png`, `${recipe.id}-after.png`, `${recipe.id}.json`] })) };
}
export function loadPlan(path: string) {
  const plan = readData<ReturnType<typeof fixturePlan>>(path);
  if (plan.schema !== 'qa-bench.judge-plan/v1' || !Array.isArray(plan.cases) || !plan.cases.length) throw new Error('Invalid judge recipe manifest');
  if (JSON.stringify(plan) !== JSON.stringify(fixturePlan())) throw new Error('Judge plan is stale or modified; regenerate it from the current sources');
  return plan;
}
