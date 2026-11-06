import type {
  AnswerKey, Decision, Episode, EpisodeScore, EpisodeStatus, Finding, FindingDecision, FindingsFile, Label, LabelOutcome,
} from '../../lib/contracts.ts';
import { matchFinding } from './matcher.ts';

interface Candidate { label: Label; score: number; reason: string }

/** Best matching label of `kind` (highest score, label order breaks ties) or the closest failure. */
function best(f: Finding, labels: Label[]): { hit?: Candidate; nearMiss?: Candidate } {
  let hit: Candidate | undefined;
  let nearMiss: Candidate | undefined;
  for (const label of labels) {
    const r = matchFinding(f, label);
    const c = { label, score: r.score, reason: r.reason };
    if (r.ok) { if (!hit || c.score > hit.score) hit = c; } else if (!nearMiss || c.score > nearMiss.score) nearMiss = c;
  }
  return { hit, nearMiss };
}

export function scoreEpisode(input: {
  episode: Episode; answerKey: AnswerKey; findings: FindingsFile | null;
  status: EpisodeStatus; status_reason?: string; wall_time_s?: number | null;
}): EpisodeScore {
  const { episode, answerKey, status } = input;
  const scored = status === 'scored';
  const findings: Finding[] = scored && input.findings ? input.findings.findings : [];
  const defects = answerKey.labels.filter((l) => l.kind === 'defect');
  const changes = answerKey.labels.filter((l) => l.kind === 'change');
  const baselines = answerKey.labels.filter((l) => l.kind === 'baseline');
  const naturals = answerKey.labels.filter((l) => l.kind === 'natural');

  const hits = new Map<string, string[]>(); // label id -> finding ids
  const addHit = (labelId: string, fid: string) => hits.set(labelId, [...(hits.get(labelId) ?? []), fid]);
  const tpTimes: number[] = [];
  const decisions: FindingDecision[] = [];

  for (const f of findings) {
    const mk = (decision: Decision, reason: string, label?: Label): FindingDecision => ({
      finding_id: f.id, decision, ...(label ? { label_id: label.id } : {}), category: f.category, reason,
    });
    // Planted defects first; a verified natural defect counts the same way when no planted one matches.
    const planted = best(f, defects);
    const d = planted.hit ? planted : best(f, naturals);
    if (d.hit) {
      const seen = hits.has(d.hit.label.id);
      addHit(d.hit.label.id, f.id);
      if (!seen) {
        if (typeof f.detected_at_s === 'number') tpTimes.push(f.detected_at_s);
        const tp = mk('true_positive', `first finding to hit defect ${d.hit.label.id}: ${d.hit.reason}`, d.hit.label);
        if (f.severity) tp.severity_agrees = f.severity === d.hit.label.severity;
        decisions.push(tp);
      } else {
        decisions.push(mk('duplicate', `defect ${d.hit.label.id} already found by ${hits.get(d.hit.label.id)![0]}: ${d.hit.reason}`, d.hit.label));
      }
      continue;
    }
    const c = best(f, changes);
    if (c.hit) {
      addHit(c.hit.label.id, f.id);
      decisions.push(mk('false_alarm_change', `flags deliberate change ${c.hit.label.id}: ${c.hit.reason}`, c.hit.label));
      continue;
    }
    const b = best(f, baselines);
    if (b.hit) {
      addHit(b.hit.label.id, f.id);
      decisions.push(mk('excused', `known baseline issue ${b.hit.label.id}: ${b.hit.reason}`, b.hit.label));
      continue;
    }
    const near = [planted.nearMiss, d.nearMiss, c.nearMiss, b.nearMiss].filter((x): x is Candidate => !!x).sort((x, y) => y.score - x.score)[0];
    const reason = near
      ? `no label matched; closest: ${near.reason}`
      : 'no active defect, change or baseline label in this episode';
    decisions.push(mk('unmatched', reason));
  }

  const labels: LabelOutcome[] = answerKey.labels.map((l) => ({
    label_id: l.id, kind: l.kind, category: l.category, class: l.class, severity: l.severity,
    exposure: l.exposure ?? 'novel', difficulty: l.difficulty ?? 'blatant',
    hit: hits.has(l.id), ...(hits.has(l.id) ? { finding_ids: hits.get(l.id) } : {}),
  }));

  const wall = input.wall_time_s ?? input.findings?.wall_time_s ?? null;
  const out: EpisodeScore = {
    episode_id: episode.id, track: episode.track, app: episode.app, split: episode.split,
    answer_key_sha256: episode.answer_key_sha256, status,
    ...(input.status_reason ? { status_reason: input.status_reason } : {}),
    wall_time_s: wall,
    ...(input.findings?.cost ? { cost: input.findings.cost } : {}),
    ...(input.findings?.activity ? { activity: input.findings.activity } : {}),
    time_to_first_detection_s: tpTimes.length ? Math.min(...tpTimes) : null,
    decisions, labels,
  };
  return out;
}
