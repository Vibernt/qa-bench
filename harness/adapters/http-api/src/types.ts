// The few bench contract types this adapter needs, copied from lib/contracts.ts so the image is self-contained.
// Keep in step with schemas/brief.schema.json and schemas/findings.schema.json.

export type Category =
  | 'functional' | 'consistency' | 'permission' | 'error-handling' | 'visual' | 'copy'
  | 'a11y' | 'perf' | 'usability' | 'email' | 'security-hygiene' | 'l10n';

export const CATEGORIES: readonly Category[] = [
  'functional', 'consistency', 'permission', 'error-handling', 'visual', 'copy',
  'a11y', 'perf', 'usability', 'email', 'security-hygiene', 'l10n',
];

export interface Journey { id: string; title: string; role: string; start?: string; steps: string[] }

export interface Brief {
  episode_id: string;
  bench_version: string;
  app: string;
  track: string;
  targets: { name: string; url: string }[];
  roles: { role: string; accounts: { username: string; password: string }[] }[];
  inbox?: { address: string; api: string };
  budget: { wall_time_s: number; money_usd?: number };
  journeys?: Journey[];
  goal?: string;
  pages?: string[];
  rules?: Record<string, unknown>;
  categories?: Category[];
  out?: { findings: string; evidence_dir: string };
}

export interface Region { x: number; y: number; w: number; h: number; viewport?: string }

export interface Finding {
  id: string;
  where: { route: string; role?: string; step?: string; selector?: string; region?: Region };
  category: Category;
  description: string;
  evidence?: { kind: 'screenshot' | 'network' | 'dom' | 'console' | 'text' | 'timing' | 'trace' | 'other'; path?: string; excerpt?: string; note?: string }[];
  confidence: number;
  repro?: string[];
  detected_at_s?: number;
  check?: string;
}

export interface Cost { model_usd?: number; compute_usd?: number; human_hours?: number; notes?: string }

export interface FindingsFile {
  episode_id: string;
  system: { name: string; version: string };
  findings: Finding[];
  cost?: Cost;
  wall_time_s?: number;
  started_at?: string;
  finished_at?: string;
  notes?: string;
}
