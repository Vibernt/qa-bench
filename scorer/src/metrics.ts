import type { Cost, Decision, EpisodeScore, FindingDecision, LabelOutcome, Metrics, Report } from '../../lib/contracts.ts';

interface Slice {
  /** Which planted labels count (recall, change rates). */
  label: (l: LabelOutcome) => boolean;
  /** Which findings count (precision, false alarms, unmatched). */
  decision: (d: FindingDecision, byLabel: Map<string, LabelOutcome>) => boolean;
  /** Time and cost only make sense for whole episodes. */
  episodeLevel: boolean;
}

const ratio = (a: number, b: number): number | null => (b > 0 ? a / b : null);

/**
 * Severity weights for weighted recall (scorer/README.md, "Severity"). Severity is set per label by impact on a real
 * user, not by category: a keyboard trap that blocks checkout is critical; a 1 px misalignment is minor.
 */
export const SEVERITY_WEIGHTS = { critical: 5, major: 3, minor: 1 } as const;
const weightOf = (s: string | undefined): number => SEVERITY_WEIGHTS[(s ?? 'major') as keyof typeof SEVERITY_WEIGHTS] ?? SEVERITY_WEIGHTS.major;
const f1Of = (r: number | null, p: number | null): number | null => (r === null || p === null ? null : r + p === 0 ? 0 : (2 * r * p) / (r + p));

export function episodeCostUsd(cost: Cost | undefined): number | null {
  if (!cost) return null;
  const { model_usd, compute_usd, human_hours, human_rate_usd_per_hour } = cost;
  if (model_usd === undefined && compute_usd === undefined && human_hours === undefined) return null;
  return (model_usd ?? 0) + (compute_usd ?? 0) + (human_hours ?? 0) * (human_rate_usd_per_hour ?? 0);
}

function sumOrNull(xs: (number | null | undefined)[]): number | null {
  const v = xs.filter((x): x is number => typeof x === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) : null;
}

function compute(scores: EpisodeScore[], s: Slice): Metrics {
  let natPresent = 0, natFound = 0;
  let planted = 0, found = 0, changesActive = 0, changesFlagged = 0, wPlanted = 0, wFound = 0, sevJudged = 0, sevAgree = 0;
  const counts: Record<Decision, number> = { true_positive: 0, duplicate: 0, false_alarm_change: 0, excused: 0, unmatched: 0 };
  for (const ep of scores) {
    const byLabel = new Map(ep.labels.map((l) => [l.label_id, l]));
    for (const l of ep.labels) {
      if (!s.label(l)) continue;
      if (l.kind === 'defect') {
        const w = weightOf(l.severity);
        planted++; wPlanted += w;
        if (l.hit) { found++; wFound += w; }
      }
      if (l.kind === 'natural') { natPresent++; if (l.hit) natFound++; }
      if (l.kind === 'change') { changesActive++; if (l.hit) changesFlagged++; }
    }
    for (const d of ep.decisions) {
      if (!s.decision(d, byLabel)) continue;
      counts[d.decision]++;
      if (d.decision === 'true_positive' && d.severity_agrees !== undefined) { sevJudged++; if (d.severity_agrees) sevAgree++; }
    }
  }
  const findings = Object.values(counts).reduce((a, b) => a + b, 0);
  const matched = counts.true_positive + counts.duplicate;
  const recall = ratio(found, planted);
  const precision = ratio(matched, findings - counts.excused);
  const f1 = f1Of(recall, precision);
  const weightedRecall = ratio(wFound, wPlanted);
  const n = scores.length;

  const m: Metrics = {
    episodes: n,
    episodes_scored: scores.filter((e) => e.status === 'scored').length,
    defects_planted: planted, defects_found: found, recall,
    weighted_defects_planted: wPlanted, weighted_defects_found: wFound, weighted_recall: weightedRecall,
    findings, findings_matched: matched, findings_excused: counts.excused, precision, f1, weighted_f1: f1Of(weightedRecall, precision),
    changes_active: changesActive, changes_flagged: changesFlagged, change_flag_rate: ratio(changesFlagged, changesActive),
    false_alarms_on_changes: counts.false_alarm_change,
    false_alarms_per_100_episodes: n ? (changesFlagged * 100) / n : null,
    unmatched_findings: counts.unmatched, unmatched_per_episode: n ? counts.unmatched / n : null,
    mean_time_to_first_detection_s: null, wall_time_s_total: null, cost_usd_total: null, human_hours_total: null,
    cost_per_defect_found_usd: null, repro_rate: null,
    natural_present: natPresent, natural_found: natFound, natural_recall: ratio(natFound, natPresent),
    severity_judged: sevJudged, severity_agreement: ratio(sevAgree, sevJudged),
  };
  if (s.episodeLevel) {
    const ttfd = scores.map((e) => e.time_to_first_detection_s).filter((x): x is number => typeof x === 'number');
    m.mean_time_to_first_detection_s = ttfd.length ? ttfd.reduce((a, b) => a + b, 0) / ttfd.length : null;
    m.wall_time_s_total = sumOrNull(scores.map((e) => e.wall_time_s));
    m.cost_usd_total = sumOrNull(scores.map((e) => episodeCostUsd(e.cost)));
    m.human_hours_total = sumOrNull(scores.map((e) => e.cost?.human_hours));
    m.cost_per_defect_found_usd = m.cost_usd_total !== null && found > 0 ? m.cost_usd_total / found : null;
    const act = scores.map((e) => e.activity).filter((a): a is NonNullable<typeof a> => !!a);
    if (act.length) {
      const mean = (k: 'tool_calls' | 'screenshots_taken' | 'screenshots_viewed'): number | null => {
        const v = act.map((a) => a[k]).filter((x): x is number => typeof x === 'number');
        return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
      };
      m.episodes_with_activity = act.length;
      m.tool_calls_per_episode = mean('tool_calls');
      m.screenshots_taken_per_episode = mean('screenshots_taken');
      m.screenshots_viewed_per_episode = mean('screenshots_viewed');
    }
  }
  return m;
}

const all: Slice = { label: () => true, decision: () => true, episodeLevel: true };

/** Label defaults (label.schema.json): exposure novel, difficulty blatant. Older score files may lack both. */
export const exposureOf = (l: LabelOutcome): string => l.exposure ?? 'novel';
export const difficultyOf = (l: LabelOutcome): string => l.difficulty ?? 'blatant';

/**
 * A slice by a label attribute (class, exposure, difficulty): labels with that value; findings by the value of the
 * label they matched. Unmatched findings have no label, so they count against every value (conservative).
 */
function labelAttrSlice(attr: (l: LabelOutcome) => string, k: string): Slice {
  return {
    label: (l) => attr(l) === k,
    decision: (d, by) => {
      const l = d.label_id ? by.get(d.label_id) : undefined;
      return l === undefined || attr(l) === k;
    },
    episodeLevel: false,
  };
}

export const EXPOSURES = ['novel', 'known'] as const;
export const DIFFICULTIES = ['subtle', 'blatant'] as const;

/** Metrics per label exposure (novel, known): `metrics.by_exposure` in the report. */
export function aggregateByExposure(scores: EpisodeScore[]): Record<string, Metrics> {
  return Object.fromEntries(EXPOSURES.map((k) => [k, compute(scores, labelAttrSlice(exposureOf, k))]));
}

/**
 * Metrics per label difficulty (subtle, blatant). Not a report field (the schema has none); the Markdown headline
 * computes it from the episode scores.
 */
export function aggregateByDifficulty(scores: EpisodeScore[]): Record<string, Metrics> {
  return Object.fromEntries(DIFFICULTIES.map((k) => [k, compute(scores, labelAttrSlice(difficultyOf, k))]));
}

/**
 * Slice rules (see scorer/README.md):
 * - category: labels of that category; findings by the finding's own category.
 * - class: labels of that class; findings by the class of the label they matched; unmatched findings have no class,
 *   so they count against every class.
 * - exposure (novel, known): the same rule as class, by the label's exposure (default novel).
 * - track x category x class: both of the above.
 */
export function aggregate(scores: EpisodeScore[]): Report['metrics']['overall'] {
  return compute(scores, all);
}

export function aggregateAll(scores: EpisodeScore[]): Report['metrics'] {
  const tracks = [...new Set(scores.map((s) => s.track))].sort();
  const cats = new Set<string>();
  const classes = new Set<string>();
  const combos = new Map<string, { track: string; category: string; class: string }>();
  for (const ep of scores) for (const d of ep.decisions) if (d.category) cats.add(d.category);
  for (const ep of scores) for (const l of ep.labels) {
    cats.add(l.category); classes.add(l.class);
    combos.set(`${ep.track}\u0000${l.category}\u0000${l.class}`, { track: ep.track, category: l.category, class: l.class });
  }
  const catSlice = (c: string): Slice => ({
    label: (l) => l.category === c, decision: (d) => d.category === c, episodeLevel: false,
  });
  const classSlice = (k: string): Slice => labelAttrSlice((l) => l.class, k);

  const by_track: Record<string, Metrics> = {};
  for (const t of tracks) by_track[t] = compute(scores.filter((s) => s.track === t), all);
  const by_category: Record<string, Metrics> = {};
  for (const c of [...cats].sort()) by_category[c] = compute(scores, catSlice(c));
  const by_class: Record<string, Metrics> = {};
  for (const k of [...classes].sort()) by_class[k] = compute(scores, classSlice(k));
  const breakdown = [...combos.values()]
    .sort((a, b) => a.track.localeCompare(b.track) || a.category.localeCompare(b.category) || a.class.localeCompare(b.class))
    .map((c) => {
      const cs = catSlice(c.category), ks = classSlice(c.class);
      return {
        ...c,
        metrics: compute(scores.filter((s) => s.track === c.track), {
          label: (l) => cs.label(l) && ks.label(l),
          decision: (d, by) => cs.decision(d, by) && ks.decision(d, by),
          episodeLevel: false,
        }),
      };
    });
  return { overall: compute(scores, all), by_track, by_category, by_class, by_exposure: aggregateByExposure(scores), breakdown };
}
