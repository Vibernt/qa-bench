// Generic page-level suite (unknown apps, the-internet, live noise sites): visit each brief page with
// GET only, never submit a form, and report console errors, HTTP >= 400 on the page or its same-origin
// resources, broken images and regex text faults. Every load goes through the rules gate (robots.txt,
// interval, page cap). No accessibility checks here: on the noise track they would only measure the
// site, not the detector (see README).
import type { SuiteContext } from '../context.ts';
import { reportScan, scanPage } from '../context.ts';
import { errorText } from '../findings.ts';
import { normaliseRoute } from '../route.ts';

/** The page URLs to visit: brief.pages resolved against each target's origin, else the targets themselves. */
export function pagesToVisit(targets: { url: string }[], pages: string[] | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (url: string): void => {
    if (!seen.has(url)) { seen.add(url); out.push(url); }
  };
  const first = targets[0];
  if (!first) return out;
  if (!pages || pages.length === 0) {
    for (const t of targets) push(new URL(t.url).toString());
    return out;
  }
  const origins = targets.map((t) => new URL(t.url).origin);
  for (const page of pages) {
    let url: URL;
    try { url = new URL(page, first.url); } catch { continue; }
    // Never wander off the targets' origins.
    if (!origins.includes(url.origin)) continue;
    push(url.toString());
  }
  return out;
}

export async function genericSuite(ctx: SuiteContext, opts: { settleMs?: number } = {}): Promise<void> {
  const urls = pagesToVisit(ctx.brief.targets, ctx.brief.pages);
  ctx.collector.note(`generic suite: ${urls.length} page(s) to visit`);
  const mp = await ctx.newPage(ctx.brief.roles[0]?.role);
  let visited = 0;
  for (const url of urls) {
    if (ctx.timeLeftMs() < 8000 + ctx.gate.interval) {
      ctx.collector.note(`stopped after ${visited} page(s): time budget`);
      break;
    }
    await ctx.step(`page ${normaliseRoute(url)}`, async () => {
      let response;
      try {
        response = await ctx.goto(mp, url, { waitUntil: 'load', timeout: Math.min(30_000, Math.max(5000, ctx.timeLeftMs() - 5000)) });
      } catch (error) {
        // A page that never finishes loading is worth a note, not a guess at a category.
        ctx.collector.note(`${normaliseRoute(url)}: load failed: ${errorText(error)}`);
        return;
      }
      if (response === undefined) return; // refused by the rules gate (noted)
      visited += 1;
      await mp.page.waitForLoadState('networkidle', { timeout: opts.settleMs ?? 3000 }).catch(() => undefined);
      const scan = await scanPage(mp.page);
      await reportScan(ctx, mp, { ...scan, missingAlt: [], unnamedButtons: [] });
    });
  }
  ctx.collector.note(`generic suite: visited ${visited} page(s), ${ctx.gate.pagesLoaded} load(s) through the gate`);
  await mp.context.close();
}
