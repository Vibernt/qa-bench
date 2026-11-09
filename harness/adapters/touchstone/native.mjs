// Run-only integration: loads an operator-owned build, never copies or modifies it.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { setTimeout, clearTimeout } from 'node:timers';
import { chromium } from 'playwright';
import { assertValid } from '../../../lib/schemas.ts';
import { sha256 } from '../../../lib/io.ts';
import { convertChecks } from './src/map.ts';

export async function nativeChecks({ briefPath, root, out }) {
  if (existsSync(out)) throw new Error('Output already exists; choose a fresh filename');
  const bytes = readFileSync(briefPath);
  const brief = assertValid('brief', JSON.parse(bytes.toString()));
  const origins = new Set(brief.targets.map(t => {
    const url = new URL(t.url);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !['http:', 'https:'].includes(url.protocol)) throw new Error('Native adapter accepts local bench targets only');
    return url.origin;
  }));
  const entry = resolve(root, 'packages/checks/dist/index.js');
  const { CheckCollector, CHECK_VIEWPORTS } = await import(pathToFileURL(entry).href);
  const pkg = JSON.parse(readFileSync(resolve(root, 'packages/checks/package.json'), 'utf8'));
  const policy = { enabledKinds: ['console', 'network', 'a11y', 'layout'], failOn: [], viewports: ['desktop', 'mobile'], budgets: {}, a11yTags: [] };
  const start = Date.now();
  const data = { schema: 'qa-bench.check-export/v1', episode_id: brief.episode_id, brief_sha256: sha256(bytes),
    system: { name: 'touchstone-checks', version: `${pkg.version}+${sha256(readFileSync(entry)).slice(0, 12)}` },
    status: 'complete', wall_time_s: 0,
    cost: { model_usd: 0, notes: 'Local native checks; no model calls. Compute billing is not measured.' }, observations: [] };
  const secrets = brief.roles.flatMap(r => r.accounts.flatMap(a => [a.username, a.password]));
  const browser = await chromium.launch({ headless: true });
  const timeout = setTimeout(() => { void browser.close(); }, brief.budget.wall_time_s * 1000);
  try {
    for (const t of brief.targets) for (const role of brief.roles) for (const viewport of ['desktop', 'mobile']) {
      const account = role.accounts[0];
      const dimensions = CHECK_VIEWPORTS[viewport];
      const context = await browser.newContext({ viewport: { width: dimensions.width, height: dimensions.height } });
      try {
        await context.route('**/*', route => origins.has(new URL(route.request().url()).origin) ? route.continue() : route.abort());
        const page = await context.newPage();
        const collector = await CheckCollector.install({ evaluate: page.evaluate.bind(page), addInitScript: page.addInitScript.bind(page),
          addScriptTag: page.addScriptTag.bind(page), waitForLoadState: page.waitForLoadState.bind(page) }, { policy, viewport, secrets });
        page.on('console', m => { if (m.type() === 'error') collector.record({ kind: 'console', rule: 'console-error', severity: 'serious', message: m.text() }); });
        page.on('pageerror', e => collector.record({ kind: 'console', rule: 'javascript-error', severity: 'serious', message: e.message }));
        page.on('requestfailed', request => collector.record({ kind: 'network', rule: 'failed-request', severity: 'serious', message: request.failure()?.errorText ?? 'Browser request failed without an error description', target: request.url() }));
        page.on('response', response => { if (response.status() >= 400 && origins.has(new URL(response.url()).origin)) collector.record({ kind: 'network', rule: 'http-error', severity: 'serious', message: `HTTP ${response.status()}`, target: response.url() }); });
        await page.goto(t.url);
        // Generic credential form, discovered from rendered controls. No labels or app switches.
        if (await page.locator('input[type=password]').count()) {
          if (!account) throw new Error('Credential form observed without a brief account');
          const user = page.locator('input[name=username],input[data-test=username]');
          if (await user.count() !== 1) throw new Error('Credential form requires an explicit sign-in integration');
          await user.fill(account.username); await page.locator('input[type=password]').fill(account.password);
          await page.locator('button[type=submit],input[type=submit]').click();
          await page.waitForLoadState('load');
          if (await page.locator('input[type=password]').count()) throw new Error('Sign-in did not reach an authenticated page');
        }
        const pages = brief.pages?.length ? brief.pages : [new URL(page.url()).pathname];
        for (const [step, path] of pages.entries()) {
          const url = new URL(path, t.url);
          if (!origins.has(url.origin)) throw new Error('Page escapes brief target');
          if (page.url() !== url.href) await page.goto(url.href);
          const checked = await collector.checkpoint(step);
          data.observations.push({ page: page.url(), role: role.role, findings: checked.findings });
        }
      } finally { await context.close(); }
    }
    data.wall_time_s = (Date.now() - start) / 1000;
    const findings = convertChecks(bytes, data);
    writeFileSync(out + '.checks.json', JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    writeFileSync(out, JSON.stringify(findings, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return findings;
  } finally { clearTimeout(timeout); await browser.close(); }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { values } = parseArgs({ options: { brief: { type: 'string' }, root: { type: 'string' }, out: { type: 'string' } } });
  try {
    if (!values.brief || !values.root || !values.out) throw new Error('Required: --brief <brief.json> --root <read-only system checkout> --out <findings.json>');
    const result = await nativeChecks({ briefPath: values.brief, root: values.root, out: values.out });
    console.log(`Completed deterministic checks: ${result.findings.length} findings`);
  } catch (error) {
    let message = error.message;
    if (values.brief) {
      const brief = JSON.parse(readFileSync(values.brief, 'utf8'));
      for (const role of brief.roles ?? []) for (const account of role.accounts) for (const value of [account.username, account.password]) if (value) message = message.replaceAll(value, '[masked]');
    }
    console.error(`Native checks failed: ${message}`); process.exitCode = 1;
  }
}
