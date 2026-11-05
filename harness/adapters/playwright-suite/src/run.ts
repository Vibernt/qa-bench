// One episode: read the brief, pick the suite by app, run it inside the time budget, always write
// findings.json. A hard timer writes whatever has been found if the suite is still running near the end.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser } from 'playwright';
import type { Brief } from './types.ts';
import { Collector, buildFindingsFile, errorText, writeFindingsFile } from './findings.ts';
import { LoadGate } from './rules.ts';
import { OutOfTime, createContext, type SuiteContext } from './context.ts';
import { expenseSuite } from './suites/expense-app.ts';
import { swagSuite } from './suites/swag-labs.ts';
import { genericSuite } from './suites/generic.ts';

export type Suite = (ctx: SuiteContext) => Promise<void>;

export const SUITES: Record<string, Suite> = {
  'expense-app': expenseSuite,
  'swag-labs': swagSuite,
  'the-internet': (ctx) => genericSuite(ctx),
};

export function suiteFor(app: string): { name: string; suite: Suite } {
  const suite = SUITES[app];
  return suite ? { name: app, suite } : { name: 'generic', suite: (ctx) => genericSuite(ctx) };
}

/** Parse and sanity-check a brief. Throws when it is unusable. */
export function parseBrief(text: string): Brief {
  const brief = JSON.parse(text) as Brief;
  if (!brief || typeof brief !== 'object') throw new Error('brief is not an object');
  if (typeof brief.episode_id !== 'string' || !brief.episode_id) throw new Error('brief has no episode_id');
  if (!Array.isArray(brief.targets) || !brief.targets[0]?.url) throw new Error('brief has no targets');
  if (!Array.isArray(brief.roles)) throw new Error('brief has no roles');
  if (!brief.budget || !(brief.budget.wall_time_s > 0)) throw new Error('brief has no budget.wall_time_s');
  return brief;
}

export function readBrief(path: string): Brief {
  return parseBrief(readFileSync(path, 'utf8'));
}

/** How long to leave at the end of the budget for writing findings and the container exiting. */
export function reserveMs(wallTimeS: number): number {
  return Math.min(20_000, Math.max(2000, wallTimeS * 1000 * 0.1));
}

export interface RunOptions {
  findingsPath?: string;
  evidenceDir?: string;
  /** Exit the process from the hard timer (the container entry point does; tests and it.ts do not). */
  exitOnHardStop?: boolean;
  log?: (message: string) => void;
  browser?: Browser;
}

export async function runEpisode(brief: Brief, opts: RunOptions = {}): Promise<{ findingsPath: string; findings: number; notes: string[] }> {
  const startedAt = new Date();
  const findingsPath = opts.findingsPath ?? brief.out?.findings ?? '/bench/out/findings.json';
  const evidenceDir = opts.evidenceDir ?? brief.out?.evidence_dir ?? join(findingsPath, '..', 'evidence');
  const log = opts.log ?? ((m: string) => process.stdout.write(`[playwright-suite] ${m}\n`));
  const collector = new Collector({ startedMs: startedAt.getTime(), evidenceDir });
  const deadlineMs = startedAt.getTime() + brief.budget.wall_time_s * 1000 - reserveMs(brief.budget.wall_time_s);
  const write = (extraNote?: string): void => {
    if (extraNote) collector.note(extraNote);
    writeFindingsFile(findingsPath, buildFindingsFile({
      episodeId: brief.episode_id, findings: collector.findings, notes: collector.notes, startedAt, finishedAt: new Date(),
    }));
  };
  // Hard stop: shortly before the budget ends, write what we have even if a check hangs.
  const hard = setTimeout(() => {
    log('hard stop: writing findings before the budget ends');
    write('hard stop: the suite was still running when the time budget ran out; findings are partial');
    if (opts.exitOnHardStop) process.exit(0);
  }, Math.max(1000, deadlineMs - Date.now() + reserveMs(brief.budget.wall_time_s) / 2));
  hard.unref();

  const { name, suite } = suiteFor(brief.app);
  collector.note(`suite ${name} for app ${brief.app}`);
  let browser = opts.browser;
  const ownBrowser = !browser;
  try {
    browser ??= await chromium.launch({ headless: true });
    const ctx = createContext({ brief, browser, collector, gate: new LoadGate(brief.rules), deadlineMs, log });
    await suite(ctx);
  } catch (error) {
    if (error instanceof OutOfTime) collector.note('stopped early: time budget used up');
    else {
      collector.note(`suite crashed: ${errorText(error)}`);
      log(`suite crashed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    }
  } finally {
    clearTimeout(hard);
    if (ownBrowser) await browser?.close().catch(() => undefined);
  }
  write();
  log(`wrote ${collector.findings.length} finding(s) to ${findingsPath}`);
  return { findingsPath, findings: collector.findings.length, notes: collector.notes };
}
