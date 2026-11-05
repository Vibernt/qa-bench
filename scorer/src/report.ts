import { BENCH_VERSION } from '../../lib/contracts.ts';
import type { EpisodeScore, Metrics, Report, SystemId } from '../../lib/contracts.ts';
import { aggregateAll, aggregateByDifficulty, aggregateByExposure } from './metrics.ts';
import { MATCHER_VERSION } from './matcher.ts';

export function buildReport(input: {
  scores: EpisodeScore[]; system: SystemId; runId: string;
  tracks?: string[]; seeds?: Record<string, number>; upstreams?: Record<string, unknown>; notes?: string; now?: Date;
}): Report {
  const tracks = input.tracks ?? [...new Set(input.scores.map((s) => s.track))].sort();
  return {
    bench_version: BENCH_VERSION,
    generated_at: (input.now ?? new Date()).toISOString(),
    system: input.system,
    run: {
      id: input.runId,
      ...(tracks.length ? { tracks } : {}),
      ...(input.seeds ? { seeds: input.seeds } : {}),
      ...(input.upstreams ? { upstreams: input.upstreams } : {}),
      matcher: MATCHER_VERSION,
      ...(input.notes ? { notes: input.notes } : {}),
    },
    episodes: input.scores,
    metrics: aggregateAll(input.scores),
  };
}

// ---- Markdown ---------------------------------------------------------------
const pct = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `${(x * 100).toFixed(1)}%`);
const dec = (x: number | null | undefined, d = 2) => (x === null || x === undefined ? '—' : x.toFixed(d));
const usd = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `$${x.toFixed(2)}`);
const secs = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `${x.toFixed(1)} s`);
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
const table = (head: string[], rows: string[][]) =>
  [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n');

const frac = (a: number | undefined, b: number | undefined) => `${a ?? 0}/${b ?? 0}`;
const metricRow = (name: string, m: Metrics) => [
  name, String(m.episodes), frac(m.defects_found, m.defects_planted), pct(m.recall), pct(m.precision), pct(m.f1),
  frac(m.changes_flagged, m.changes_active), dec(m.false_alarms_per_100_episodes, 1), dec(m.unmatched_per_episode),
];
const METRIC_HEAD = ['', 'Episodes', 'Defects found', 'Recall', 'Precision', 'F1', 'Changes flagged', 'False alarms /100 ep', 'Unmatched /ep'];

const sliceRecall = (s: Metrics | undefined, what: string) =>
  s && s.defects_planted ? `${pct(s.recall)} (${frac(s.defects_found, s.defects_planted)} ${what})` : `— (no ${what} planted)`;

export function renderMarkdown(report: Report): string {
  const m = report.metrics.overall;
  // Older reports have no by_exposure; both slices can be recomputed from the episode scores.
  const byExposure = report.metrics.by_exposure ?? aggregateByExposure(report.episodes);
  const byDifficulty = aggregateByDifficulty(report.episodes);
  const L: string[] = [];
  L.push(`# QA Bench report: ${report.system.name} ${report.system.version} (bench ${report.bench_version})`, '');
  L.push(`- Run: \`${report.run.id}\``);
  L.push(`- Generated: ${report.generated_at}`);
  if (report.run.tracks?.length) L.push(`- Tracks: ${report.run.tracks.join(', ')}`);
  if (report.run.seeds) L.push(`- Seeds: ${Object.entries(report.run.seeds).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  if (report.run.upstreams) L.push(`- Upstreams: ${Object.keys(report.run.upstreams).join(', ')}`);
  L.push(`- Matcher: ${report.run.matcher ?? 'unknown'}`);
  if (report.run.notes) L.push(`- Notes: ${report.run.notes}`);
  L.push('', '## Headline', '');
  L.push(table(['Metric', 'Value'], [
    ['Recall', `${pct(m.recall)} (${frac(m.defects_found, m.defects_planted)} defects)`],
    ['Recall (novel defects)', sliceRecall(byExposure.novel, 'novel defects')],
    ['Recall (known, publicly documented)', sliceRecall(byExposure.known, 'known defects')],
    ['Recall (subtle)', sliceRecall(byDifficulty.subtle, 'subtle defects')],
    ['Recall (blatant)', sliceRecall(byDifficulty.blatant, 'blatant defects')],
    ['Severity-weighted recall', `${pct(m.weighted_recall ?? null)} (${dec(m.weighted_defects_found ?? null, 0)}/${dec(m.weighted_defects_planted ?? null, 0)} weight; critical 5, major 3, minor 1)`],
    ['Natural defects found', m.natural_present ? `${pct(m.natural_recall ?? null)} (${frac(m.natural_found ?? 0, m.natural_present)} verified real bugs nobody planted)` : '— (none labelled for these apps)'],
    ['Precision', pct(m.precision)],
    ['F1', pct(m.f1)],
    ['Severity-weighted F1', pct(m.weighted_f1 ?? null)],
    ['False alarms per 100 episodes', dec(m.false_alarms_per_100_episodes, 1)],
    ['Unmatched findings per episode', dec(m.unmatched_per_episode)],
    ['Mean time to first detection', secs(m.mean_time_to_first_detection_s)],
    ['Cost', `${usd(m.cost_usd_total)} (per defect found: ${usd(m.cost_per_defect_found_usd)})`],
    ['Human hours', dec(m.human_hours_total)],
    ['Wall time', secs(m.wall_time_s_total)],
    ['Severity agreement', m.severity_judged ? `${pct(m.severity_agreement ?? null)} of ${m.severity_judged} true positives that stated a severity` : '— (no finding stated a severity)'],
    ['Episodes scored', `${m.episodes_scored ?? 0}/${m.episodes}`],
  ]), '');

  L.push('## By track', '');
  L.push(table(['Track', ...METRIC_HEAD.slice(1)], Object.entries(report.metrics.by_track).map(([k, v]) => metricRow(k, v))), '');

  L.push('## By category and class', '');
  L.push(table(['Track', 'Category', 'Class', 'Defects found', 'Recall', 'Precision', 'Unmatched'],
    report.metrics.breakdown.map((b) => [
      b.track, b.category, b.class, frac(b.metrics.defects_found, b.metrics.defects_planted), pct(b.metrics.recall),
      pct(b.metrics.precision), String(b.metrics.unmatched_findings ?? 0),
    ])), '');
  L.push('Per category', '');
  L.push(table(METRIC_HEAD.map((h, i) => (i === 0 ? 'Category' : h)), Object.entries(report.metrics.by_category).map(([k, v]) => metricRow(k, v))), '');
  L.push('Per class', '');
  L.push(table(METRIC_HEAD.map((h, i) => (i === 0 ? 'Class' : h)), Object.entries(report.metrics.by_class).map(([k, v]) => metricRow(k, v))), '');

  L.push('## Episodes', '');
  L.push(table(['Episode', 'Track', 'App', 'Status', 'Defects found', 'Findings', 'TP', 'Dup', 'Change FA', 'Excused', 'Unmatched', 'First detection', 'Wall time'],
    report.episodes.map((e) => {
      const n = (d: string) => e.decisions.filter((x) => x.decision === d).length;
      const dl = e.labels.filter((l) => l.kind === 'defect');
      return [
        e.episode_id, e.track, e.app, e.status + (e.status_reason ? ` (${e.status_reason})` : ''),
        frac(dl.filter((l) => l.hit).length, dl.length), String(e.decisions.length),
        String(n('true_positive')), String(n('duplicate')), String(n('false_alarm_change')), String(n('excused')), String(n('unmatched')),
        secs(e.time_to_first_detection_s), secs(e.wall_time_s),
      ];
    })), '');

  L.push('## Findings', '');
  for (const e of report.episodes) {
    L.push(`<details><summary>${e.episode_id}: ${e.decisions.length} finding(s), status ${e.status}</summary>`, '');
    const missed = e.labels.filter((l) => l.kind === 'defect' && !l.hit).map((l) => l.label_id);
    if (missed.length) L.push(`Missed defects: ${missed.map((x) => `\`${x}\``).join(', ')}`, '');
    if (e.decisions.length) {
      for (const d of e.decisions) {
        L.push(`- \`${d.finding_id}\` **${d.decision}**${d.label_id ? ` → \`${d.label_id}\`` : ''}${d.category ? ` [${d.category}]` : ''}: ${d.reason.replace(/\n/g, ' ')}`);
      }
    } else L.push('_No findings._');
    L.push('', '</details>', '');
  }
  return L.join('\n');
}
