export type JudgeKind = 'visual-defect' | 'intended-change' | 'a11y';
export type Outcome = 'ok' | 'problem' | 'unsure';
export interface Artifact { path: string; sha256: string }
export interface JudgeCase {
  id: string;
  app: string;
  group: string;
  kind: JudgeKind;
  label: 'ok' | 'problem';
  defect_id: string | null;
  change_id: string | null;
  twin_of: string | null;
  screenshot: Artifact;
  baseline: Artifact;
  evidence: Artifact;
}
export interface JudgeSet {
  schema: 'qa-bench.judge-set/v1';
  track: '7.9';
  generator: string;
  source_sha256: string;
  environment: { node: string; browser: string; platform: string };
  cases: JudgeCase[];
}
export interface JudgeEvidence {
  page: string;
  text: string;
  a11yTree: string;
  context: Record<string, unknown>;
  masking: { version: 'bench-masks/v1'; selectors: string[]; known_secrets: true };
}
export interface JudgeAnswer {
  outcome: Outcome;
  confidence: number;
  probabilities: Record<Outcome, number>;
  reason: string;
}
export interface CallRecord {
  case_id: string;
  answer: JudgeAnswer | null;
  status: 'answered' | 'invalid_output' | 'provider_error' | 'not_judged';
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  reserved_usd: number;
  response_id?: string;
  response_model?: string;
  wall_time_ms: number;
}
export interface JudgeRun {
  schema: 'qa-bench.judge-run/v1';
  model: string;
  config_sha256: string;
  manifest_sha256: string;
  pricing: { source: string; checked: string; input_per_million: number; output_per_million: number };
  max_usd: number;
  status: 'complete' | 'budget_stopped' | 'failed';
  calls: CallRecord[];
}
