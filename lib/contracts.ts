// TypeScript mirrors of the JSON Schemas in schemas/. The schemas are the source of truth;
// keep these in step with them.

export type Category =
  | 'functional' | 'consistency' | 'permission' | 'error-handling' | 'visual' | 'copy'
  | 'a11y' | 'perf' | 'usability' | 'email' | 'security-hygiene' | 'l10n';
export type LabelClass = 'deterministic' | 'judged' | 'human';
export type Severity = 'critical' | 'major' | 'minor';
export type LabelKind = 'defect' | 'change' | 'baseline' | 'natural';
export type Split = 'public' | 'heldout';

export interface Region { x: number; y: number; w: number; h: number; viewport?: string }

export interface Where {
  route: string;
  role?: string;
  step?: string;
  selector?: string;
  region?: Region;
}

export interface Cost {
  model_usd?: number;
  compute_usd?: number;
  human_hours?: number;
  human_rate_usd_per_hour?: number;
  notes?: string;
}

export interface SystemId { name: string; version: string }

// ---- upstream.json --------------------------------------------------------
export interface Upstream {
  app: string;
  repo: string;
  pin: { commit?: string; image?: string; ref?: string; path?: string };
  licence: string;
  licence_checked: string;
  licence_file?: string;
  use: 'adopt' | 'mutate' | 'run-only' | 'private-pull';
  vendored_at?: string;
  changes_from_upstream?: string[];
  tracks?: string[];
  notes?: string;
}

// ---- app.yaml -------------------------------------------------------------
export interface AppTarget { name: string; service: string; port: number; path?: string; health_path?: string }
export interface AppRole {
  role: string;
  accounts: number;
  username_prefix?: string;
  env?: string;
  fixed?: { username: string; password: string }[];
}
export interface Journey { id: string; title: string; role: string; start?: string; steps: string[] }
export interface AppConfig {
  app: string;
  title: string;
  purpose?: string;
  label_prefix?: string;
  noise_only?: boolean;
  available?: { requires_env?: string[]; fetch?: string };
  targets: AppTarget[];
  roles: AppRole[];
  seed_env?: Record<string, string>;
  journeys?: Journey[];
  pages?: string[];
}

// ---- label.yaml -----------------------------------------------------------
export type EvidenceKind =
  | 'value' | 'element' | 'text' | 'console' | 'network' | 'status' | 'visual' | 'timing' | 'a11y' | 'behaviour';

export interface FoundBy {
  kind: EvidenceKind;
  route?: string;
  role?: string;
  category?: Category;
  /** Other categories a reasonable report of the same evidence may use. */
  also_categories?: Category[];
  /** Case-insensitive regex the finding's description must match. */
  description_pattern?: string;
  selector?: string;
  region?: Region;
  note?: string;
}

export interface Tolerance {
  route?: 'exact' | 'prefix' | 'any';
  role?: 'exact' | 'any';
  region_px?: number;
  require_locator?: boolean;
}

export interface Label {
  id: string;
  app: string;
  title: string;
  description?: string;
  track?: string;
  kind: LabelKind;
  category: Category;
  class: LabelClass;
  severity: Severity;
  difficulty?: 'blatant' | 'subtle';
  exposure?: 'novel' | 'known';
  where: Where;
  switch?: { env?: Record<string, string>; exclusive?: string };
  found_by: FoundBy[];
  tolerance?: Tolerance;
  split: Split;
  operator?: string;
  upstream_ref?: string;
}

// ---- tracks/<track>.yaml --------------------------------------------------
export interface Range { min: number; max: number }
export interface Rules {
  methods?: ('GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[];
  forms?: boolean;
  robots_txt?: 'honour' | 'ignore';
  min_interval_ms?: number;
  max_pages?: number;
}
export interface TrackApp { app: string; weight?: number; mutations?: '*' | string[]; changes?: '*' | string[] }
export interface Track {
  id: string;
  number: string;
  title: string;
  description?: string;
  brief?: { journeys?: boolean; goal?: string; wall_time_s?: number; money_usd?: number; mode?: 'regression' | 'exploratory' };
  apps: TrackApp[];
  episodes: {
    count: number;
    seed: number;
    mutations_per_episode?: Range;
    changes_per_episode?: Range;
    clean_episodes?: number;
    twin_episodes?: number;
    max_blatant_per_episode?: number;
  };
  live?: { name: string; url: string; pages?: string[]; rules: Rules }[];
}

// ---- episodes/ ------------------------------------------------------------
export interface Account { role: string; username: string; password: string }
export interface Episode {
  id: string;
  bench_version: string;
  track: string;
  app: string;
  split: Split;
  seed: number;
  kind?: 'mixed' | 'clean' | 'twin';
  active: { mutations: string[]; changes: string[] };
  env: Record<string, string>;
  accounts: Account[];
  upstream?: Record<string, unknown>;
  live?: { name: string; url: string; pages?: string[]; rules: Rules };
  answer_key_sha256: string;
}

export interface AnswerKey {
  episode_id: string;
  app: string;
  track: string;
  noise_only: boolean;
  labels: Label[];
}

// ---- brief.json (the only thing an adapter is given) ------------------------
export interface Brief {
  episode_id: string;
  bench_version: string;
  app: string;
  track: string;
  mode?: 'regression' | 'exploratory';
  purpose?: string;
  targets: { name: string; url: string }[];
  roles: { role: string; accounts: { username: string; password: string }[] }[];
  inbox?: { address: string; api: string };
  budget: { wall_time_s: number; money_usd?: number };
  journeys?: Journey[];
  goal?: string;
  pages?: string[];
  rules?: Rules;
  categories?: Category[];
  out?: { findings: string; evidence_dir: string };
}

// ---- findings.json ----------------------------------------------------------
export interface Evidence {
  kind: 'screenshot' | 'network' | 'dom' | 'console' | 'text' | 'timing' | 'trace' | 'other';
  path?: string;
  excerpt?: string;
  note?: string;
}
export interface Finding {
  id: string;
  where: Where;
  category: Category;
  severity?: Severity;
  description: string;
  evidence?: Evidence[];
  confidence: number;
  repro?: string[];
  detected_at_s?: number;
  check?: string;
}
/** How a system worked (defs.schema.json#/$defs/activity). Reported beside the scores, never scored. */
export interface Activity {
  tool_calls?: number;
  screenshots_taken?: number;
  /** Times the system looked at an image, not just saved one. */
  screenshots_viewed?: number;
}

export interface FindingsFile {
  episode_id: string;
  system: SystemId;
  findings: Finding[];
  cost?: Cost;
  wall_time_s?: number;
  activity?: Activity;
  started_at?: string;
  finished_at?: string;
  notes?: string;
}

// ---- adapter.json -----------------------------------------------------------
export interface AdapterManifest {
  name: string;
  version: string;
  description: string;
  mode: 'container' | 'manual';
  build?: string;
  command?: string[];
  network?: 'episode' | 'host';
  env_passthrough?: string[];
  needs_approval?: string;
}

// ---- report.json ------------------------------------------------------------
export type Decision = 'true_positive' | 'duplicate' | 'false_alarm_change' | 'excused' | 'unmatched';
export type EpisodeStatus = 'scored' | 'adapter_error' | 'timeout' | 'invalid_findings' | 'skipped';

export interface FindingDecision {
  finding_id: string;
  decision: Decision;
  label_id?: string;
  category?: string;
  reason: string;
  severity_agrees?: boolean;
}
export interface LabelOutcome {
  label_id: string;
  kind: LabelKind;
  category: Category;
  class: LabelClass;
  severity?: Severity;
  exposure?: 'novel' | 'known';
  difficulty?: 'blatant' | 'subtle';
  hit: boolean;
  finding_ids?: string[];
}
export interface EpisodeScore {
  episode_id: string;
  track: string;
  app: string;
  split: Split;
  answer_key_sha256?: string;
  status: EpisodeStatus;
  status_reason?: string;
  wall_time_s?: number | null;
  cost?: Cost;
  activity?: Activity;
  time_to_first_detection_s?: number | null;
  decisions: FindingDecision[];
  labels: LabelOutcome[];
}
export interface Metrics {
  episodes: number;
  episodes_scored?: number;
  defects_planted: number;
  defects_found: number;
  recall: number | null;
  weighted_defects_planted?: number;
  weighted_defects_found?: number;
  weighted_recall?: number | null;
  findings: number;
  findings_matched?: number;
  findings_excused?: number;
  precision: number | null;
  f1?: number | null;
  weighted_f1?: number | null;
  changes_active?: number;
  changes_flagged?: number;
  change_flag_rate?: number | null;
  false_alarms_on_changes?: number;
  false_alarms_per_100_episodes?: number | null;
  unmatched_findings?: number;
  unmatched_per_episode?: number | null;
  mean_time_to_first_detection_s?: number | null;
  wall_time_s_total?: number | null;
  cost_usd_total?: number | null;
  human_hours_total?: number | null;
  cost_per_defect_found_usd?: number | null;
  repro_rate?: number | null;
  natural_present?: number;
  natural_found?: number;
  natural_recall?: number | null;
  severity_judged?: number;
  severity_agreement?: number | null;
  episodes_with_activity?: number;
  tool_calls_per_episode?: number | null;
  screenshots_taken_per_episode?: number | null;
  screenshots_viewed_per_episode?: number | null;
}
export interface Report {
  bench_version: string;
  generated_at: string;
  system: SystemId;
  run: {
    id: string;
    tracks?: string[];
    seeds?: Record<string, number>;
    upstreams?: Record<string, unknown>;
    matcher?: string;
    notes?: string;
  };
  episodes: EpisodeScore[];
  metrics: {
    overall: Metrics;
    by_track: Record<string, Metrics>;
    by_category: Record<string, Metrics>;
    by_class: Record<string, Metrics>;
    by_exposure?: Record<string, Metrics>;
    breakdown: { track: string; category: string; class: string; metrics: Metrics }[];
  };
}

export const BENCH_VERSION = '0.2.0-dev';
