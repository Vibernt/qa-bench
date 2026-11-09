/* global document */
import { Buffer } from 'node:buffer';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { writeJson, sha256 } from '../../../lib/io.ts';
import { recipes } from '../src/catalogue.ts';
import { fixturePlan } from '../src/plan.ts';
import { target, prepare } from './targets.mjs';
import { checkState } from './probes.mjs';

const MASKS = ['input[type=password]', 'input[name=username]', '[data-judge-mask]'];
export async function generate(outDir) {
  const root = resolve(outDir);
  if (existsSync(root)) throw new Error('Fixture output already exists; choose a fresh directory');
  mkdirSync(root, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const manifest = { schema: 'qa-bench.judge-set/v1', track: '7.9', generator: 'bench-render/v1', source_sha256: fixturePlan().source_sha256,
    environment: { node: process.version, browser: browser.version(), platform: process.platform }, cases: [] };
  const save = (path, bytes) => { writeFileSync(join(root, path), bytes); return { path, sha256: sha256(bytes) }; };
  try {
    for (const recipe of recipes()) {
      const account = { username: `judge-${recipe.id}`, password: sha256(`seed/v1/${recipe.id}`) };
      const captures = [];
      for (const baseline of [true, false]) {
        const app = await target(recipe, baseline, account);
        const context = await browser.newContext({ viewport: { width: recipe.width, height: 1568 },
          deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC', colorScheme: 'light', reducedMotion: 'reduce' });
        try {
          // Never contact third-party telemetry, fonts or APIs during fixture generation.
          await context.route('**/*', route => new URL(route.request().url()).origin === app.origin ? route.continue() : route.abort());
          await context.addInitScript(() => { Math.random = () => 0.375; });
          const page = await context.newPage();
          await prepare(page, recipe, app.origin, account);
          await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())); });
          await checkState(page, recipe, baseline);
          // Mark private identity without changing layout, then apply pixel masks during screenshot capture.
          await page.evaluate(() => {
            for (const node of document.querySelectorAll('p,[data-testid=session-account]')) if (/Signed in as|^judge-case-/.test(node.textContent)) node.setAttribute('data-judge-mask', '');
          });
          const scrub = text => text.replaceAll(account.username, '[masked]').replaceAll(account.password, '[masked]');
          const text = scrub(await page.locator('body').innerText());
          const a11yTree = scrub(await page.locator('body').ariaSnapshot());
          const png = await page.screenshot({ animations: 'disabled', caret: 'hide', mask: MASKS.map(s => page.locator(s)), maskColor: '#000000' });
          const image = save(`${recipe.id}-${baseline ? 'before' : 'after'}.png`, png);
          captures.push({ image, text, a11yTree });
        } finally { await context.close(); await app.close(); }
      }
      const [before, after] = captures;
      if (recipe.label === 'problem' && before.image.sha256 === after.image.sha256) throw new Error(`Defect image unchanged: ${recipe.id}`);
      const context = { comparison: 'baseline then current', viewport: { width: recipe.width, height: 1568 },
        ...(recipe.variant === 'restyle' ? { approvedChange: 'Palette, button shape and row spacing may change. Content, actions and readability must remain usable.' } : {}),
        ...(recipe.app === 'survey-site' ? { approvedChange: recipe.variant === 'cosmetic' ? 'Editorial heading revised.' : 'Contact form adds optional phone and Request callback action.' } : {}),
        ...(recipe.group === 'expense.focus-ring-removed' ? { interaction: 'Keyboard Tab has focused the username field in both images.' } : {}) };
      const evidence = save(`${recipe.id}.json`, Buffer.from(JSON.stringify({ page: recipe.route, text: after.text, a11yTree: after.a11yTree,
        context: { ...context, baselineText: before.text, baselineA11yTree: before.a11yTree },
        masking: { version: 'bench-masks/v1', selectors: MASKS, known_secrets: true } }, null, 2) + '\n'));
      manifest.cases.push({ id: recipe.id, app: recipe.app, group: recipe.group, kind: recipe.kind, label: recipe.label,
        defect_id: recipe.defect_id, change_id: recipe.change_id, twin_of: recipe.twin_of,
        screenshot: after.image, baseline: before.image, evidence });
      console.log(`captured ${recipe.id}`);
    }
    writeJson(join(root, 'manifest.json'), manifest);
    return manifest;
  } finally { await browser.close(); }
}
