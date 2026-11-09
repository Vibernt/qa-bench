import { parseAnswer } from '../../harness/judges/src/request.ts';
import type { CallRecord, JudgeCase, JudgeRun, JudgeSet } from '../../harness/judges/src/types.ts';

const ratio = (n: number, d: number): number | null => d ? n / d : null;
export function qualification(cases: number, precision: number | null): 'shadow' | 'suggest' | 'auto' {
  if (precision === null) return 'shadow';
  if (cases >= 200 && precision >= .98) return 'auto';
  if (cases >= 50 && precision >= .95) return 'suggest';
  return 'shadow';
}
function metrics(cases: JudgeCase[], calls: Map<string, CallRecord>, complete: boolean) {
  let tp = 0, fp = 0, unsure = 0, missing = 0, escalated = 0, eligible = 0, eligibleTp = 0, eligibleFp = 0;
  let twinFp = 0, cost = 0, unknownCost = false, brier = 0, answered = 0;
  const bins = Array.from({ length: 5 }, (_, i) => ({ lower: i / 5, upper: (i + 1) / 5, count: 0, correct: 0 }));
  for (const c of cases) {
    const call = calls.get(c.id);
    if (call?.cost_usd === null || !call) unknownCost = true; else cost += call.cost_usd;
    if (!call?.answer || call.status !== 'answered') { missing++; continue; }
    const a = call.answer;
    answered++;
    brier += (a.probabilities.problem - Number(c.label === 'problem')) ** 2;
    const bin = bins[Math.min(4, Math.floor(a.confidence * 5))]!;
    bin.count++; bin.correct += Number(a.outcome === c.label);
    if (a.outcome === 'unsure') unsure++;
    if (a.outcome === 'problem') { if (c.label === 'problem') tp++; else { fp++; if (c.twin_of) twinFp++; } }
    if (a.outcome === 'unsure' || a.confidence < .95) { escalated++; continue; }
    eligible++;
    if (a.outcome === 'problem') { if (c.label === 'problem') eligibleTp++; else eligibleFp++; }
  }
  const problems = cases.filter(c => c.label === 'problem').length;
  const twins = cases.filter(c => c.twin_of).length;
  const stage = complete && !missing ? qualification(eligible, ratio(eligibleTp, eligibleTp + eligibleFp)) : 'shadow';
  return { cases: cases.length, groups: new Set(cases.map(c => c.group)).size, problems,
    answered, missing_or_invalid: missing, true_positives: tp, false_positives: fp,
    precision: ratio(tp, tp + fp), recall: ratio(tp, problems), twins, false_alarms_on_twins: twinFp,
    twin_false_alarm_rate: ratio(twinFp, twins), unsure_rate: ratio(unsure, cases.length),
    escalation_rate: ratio(escalated + missing, cases.length), eligible_decisions: eligible,
    eligible_precision: ratio(eligibleTp, eligibleTp + eligibleFp),
    cost_usd: unknownCost ? null : cost, measured_cost_subtotal_usd: cost,
    cost_per_case_usd: unknownCost ? null : ratio(cost, cases.length),
    brier_problem: ratio(brier, answered), calibration: bins, stage,
    spot_check_every: stage === 'auto' ? 20 : null };
}
export function scoreJudges(set: JudgeSet, digest: string, run: JudgeRun) {
  if (run.schema !== 'qa-bench.judge-run/v1' || run.manifest_sha256 !== digest) throw new Error('Run does not bind this manifest');
  const ids = new Set(set.cases.map(c => c.id));
  const calls = new Map<string, CallRecord>();
  for (const call of run.calls) {
    if (!ids.has(call.case_id) || calls.has(call.case_id)) throw new Error('Unknown or duplicate case result');
    if (call.answer) parseAnswer(JSON.stringify(call.answer));
    if (call.status === 'answered' && !call.answer) throw new Error('Answered call lacks answer');
    if (call.cost_usd !== null && (!Number.isFinite(call.cost_usd) || call.cost_usd < 0)) throw new Error('Invalid cost');
    calls.set(call.case_id, call);
  }
  const complete = run.status === 'complete' && calls.size === ids.size;
  const overall = metrics(set.cases, calls, complete);
  const by_kind = Object.fromEntries([...new Set(set.cases.map(c => c.kind))].sort().map(k => [k,
    metrics(set.cases.filter(c => c.kind === k), calls, complete)]));
  return { schema: 'qa-bench.judge-score/v1', track: '7.9', model: run.model,
    manifest_sha256: digest, config_sha256: run.config_sha256, run_status: run.status,
    overall, by_kind, model_stage: Object.values(by_kind).every(m => m.stage === 'auto') ? 'auto'
      : Object.values(by_kind).every(m => m.stage !== 'shadow') ? 'suggest' : 'shadow',
    qualification_policy: 'Per-kind, confidence >=0.95, >=50 decisive cases and >=95% problem precision for suggest; >=200 and >=98% for auto; auto needs 1/20 human spot checks. No production promotion.',
    limitations: 'Public seed corpus; viewport siblings share groups. Overall case-count qualification is descriptive; production autonomy requires per-kind calibration and independent human review.' };
}
export type JudgeScore = ReturnType<typeof scoreJudges>;
export function judgeMarkdown(scores: JudgeScore[]): string {
  const pct = (n: number | null) => n === null ? '—' : `${(100 * n).toFixed(1)}%`;
  const money = (n: number | null) => n === null ? 'unknown' : `$${n.toFixed(6)}`;
  const lines = ['# Track 7.9: judge calibration', '',
    '| Model / kind | Cases | Precision | Recall | Twin alarms | Unsure | USD/case | Stage |',
    '|---|---:|---:|---:|---:|---:|---:|---|'];
  const notes: string[] = [];
  for (const s of scores) {
    for (const [kind, m] of [['overall', s.overall], ...Object.entries(s.by_kind)] as const) {
      lines.push(`| ${s.model} / ${kind} | ${m.cases} | ${pct(m.precision)} | ${pct(m.recall)} | ${m.false_alarms_on_twins}/${m.twins} | ${pct(m.unsure_rate)} | ${money(m.cost_per_case_usd)} | ${kind === 'overall' ? s.model_stage : m.stage} |`);
    }
    notes.push(`${s.model}: run ${s.run_status}; manifest ${s.manifest_sha256}; config ${s.config_sha256}.`);
  }
  for (const note of notes) lines.push('', note);
  lines.push('', 'Stages are per kind. Missing/invalid calls prevent qualification. Low-confidence decisions escalate from the cheap judge to the LLM, then to a person. Auto requires 1 in 20 human spot checks. Public viewport siblings are not independent production samples.');
  return lines.join('\n') + '\n';
}
export function judgeAgreement(a: JudgeRun, b: JudgeRun) {
  if (a.manifest_sha256 !== b.manifest_sha256) throw new Error('Agreement requires the same manifest');
  const other = new Map(b.calls.filter(c => c.status === 'answered').map(c => [c.case_id, c.answer]));
  const paired = a.calls.filter(c => c.status === 'answered' && c.answer && other.get(c.case_id));
  return { models: [a.model, b.model], paired: paired.length,
    agreement: ratio(paired.filter(c => c.answer!.outcome === other.get(c.case_id)!.outcome).length, paired.length) };
}
