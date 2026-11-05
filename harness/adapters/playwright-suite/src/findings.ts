// Building findings: ids, routes, de-duplication, screenshots, and the findings.json document.
import { mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Category, Evidence, Finding, FindingsFile, Region } from './types.ts';
import { CATEGORIES } from './types.ts';
import { normaliseRoute } from './route.ts';

export const SYSTEM = { name: 'playwright-suite', version: '0.1.0' } as const;

/** Anything that can take a screenshot (a Playwright Page), kept structural so tests need no browser. */
export interface Shooter { screenshot(options: { path: string; fullPage?: boolean; timeout?: number }): Promise<unknown> }

export interface FindingInput {
  check: string;
  category: Category;
  /** A URL or a path; stored as the normalised pathname. */
  route: string;
  role?: string;
  step?: string;
  selector?: string;
  region?: Region;
  description: string;
  evidence?: Evidence[];
  confidence: number;
  repro?: string[];
  /** Screenshot this page as evidence. */
  page?: Shooter;
  /** De-duplication key; defaults to check + route + selector (not role: one defect, one report). */
  key?: string;
  /** When the problem was seen (seconds after start); defaults to now. */
  detectedAtS?: number;
}

export class Collector {
  readonly findings: Finding[] = [];
  readonly notes: string[] = [];
  private keys = new Map<string, Finding | undefined>();
  private readonly startedMs: number;
  private readonly evidenceDir: string | undefined;
  private readonly now: () => number;

  constructor(opts: { startedMs: number; evidenceDir?: string; now?: () => number }) {
    this.startedMs = opts.startedMs;
    this.evidenceDir = opts.evidenceDir;
    this.now = opts.now ?? (() => Date.now());
  }

  elapsedS(): number {
    return Math.max(0, Math.round((this.now() - this.startedMs) / 100) / 10);
  }

  note(text: string): void {
    this.notes.push(text);
  }

  has(key: string): boolean {
    return this.keys.has(key);
  }

  static keyOf(input: Pick<FindingInput, 'check' | 'route' | 'selector' | 'key'>): string {
    return input.key ?? `${input.check}|${normaliseRoute(input.route)}|${input.selector ?? ''}`;
  }

  /** Record a finding (once per key), with a screenshot of `input.page`. Undefined for a duplicate. */
  async add(input: FindingInput): Promise<Finding | undefined> {
    const finding = this.addNow(input);
    if (!finding || !input.page || !this.evidenceDir) return finding;
    const file = `${finding.id}.png`;
    try {
      mkdirSync(this.evidenceDir, { recursive: true });
      await input.page.screenshot({ path: join(this.evidenceDir, file), timeout: 5000 });
      finding.evidence = [{ kind: 'screenshot', path: file }, ...(finding.evidence ?? [])];
    } catch (error) {
      this.note(`screenshot for ${finding.id} failed: ${errorText(error)}`);
    }
    return finding;
  }

  /** Record a finding (once per key) synchronously, without a screenshot. */
  addNow(input: FindingInput): Finding | undefined {
    const key = Collector.keyOf(input);
    if (this.keys.has(key)) return undefined;
    if (!CATEGORIES.includes(input.category)) throw new Error(`unknown category ${input.category}`);
    this.keys.set(key, undefined);
    const id = `pw-${String(this.findings.length + 1).padStart(3, '0')}-${slug(input.check)}`;
    const evidence: Evidence[] = [...(input.evidence ?? [])].map((e) => ({
      ...e,
      ...(e.excerpt !== undefined ? { excerpt: clip(e.excerpt, 2000) } : {}),
    }));
    const finding: Finding = {
      id,
      where: {
        route: normaliseRoute(input.route),
        ...(input.role ? { role: input.role } : {}),
        ...(input.step ? { step: input.step } : {}),
        ...(input.selector ? { selector: input.selector } : {}),
        ...(input.region ? { region: roundRegion(input.region) } : {}),
      },
      category: input.category,
      description: clip(input.description, 1000),
      ...(evidence.length ? { evidence } : {}),
      confidence: Math.min(1, Math.max(0, input.confidence)),
      ...(input.repro?.length ? { repro: input.repro } : {}),
      detected_at_s: input.detectedAtS ?? this.elapsedS(),
      check: input.check,
    };
    this.findings.push(finding);
    this.keys.set(key, finding);
    return finding;
  }

  /** Add a sentence (and evidence) to an earlier finding, for a second symptom of the same problem. */
  amend(key: string, sentence: string, evidence?: Evidence[]): boolean {
    const finding = this.keys.get(key);
    if (!finding) return false;
    finding.description = clip(`${finding.description}. ${sentence}`, 1000);
    if (evidence?.length) finding.evidence = [...(finding.evidence ?? []), ...evidence];
    return true;
  }
}

export function buildFindingsFile(opts: {
  episodeId: string;
  findings: Finding[];
  notes: string[];
  startedAt: Date;
  finishedAt: Date;
}): FindingsFile {
  const wall = Math.max(0, (opts.finishedAt.getTime() - opts.startedAt.getTime()) / 1000);
  return {
    episode_id: opts.episodeId,
    system: { ...SYSTEM },
    findings: opts.findings,
    cost: { compute_usd: 0, model_usd: 0, notes: 'Scripted Playwright suite: no model calls; local compute only, not metered.' },
    wall_time_s: Math.round(wall * 10) / 10,
    started_at: opts.startedAt.toISOString(),
    finished_at: opts.finishedAt.toISOString(),
    ...(opts.notes.length ? { notes: clip(opts.notes.join('\n'), 20_000) } : {}),
  };
}

/** Write atomically (temp file + rename), so a hard stop never leaves half a file. */
export function writeFindingsFile(path: string, file: FindingsFile): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(file, null, 2) + '\n');
  renameSync(tmp, path);
}

export function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'check';
}

export function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function errorText(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.split('\n')[0] ?? text;
}

function roundRegion(region: Region): Region {
  return {
    x: Math.round(region.x), y: Math.round(region.y),
    w: Math.max(0, Math.round(region.w)), h: Math.max(0, Math.round(region.h)),
    ...(region.viewport ? { viewport: region.viewport } : {}),
  };
}
