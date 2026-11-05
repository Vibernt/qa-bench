// Copies of the few contract types this adapter needs (source of truth: schemas/*.schema.json,
// mirrored in lib/contracts.ts). Copied, not imported, so the image is self-contained: the runner
// mounts only /bench/brief and /bench/out.

export type Category =
  | 'functional' | 'consistency' | 'permission' | 'error-handling' | 'visual' | 'copy'
  | 'a11y' | 'perf' | 'usability' | 'email' | 'security-hygiene' | 'l10n';

export interface Region { x: number; y: number; w: number; h: number; viewport?: string }

export interface Where {
  route: string;
  role?: string;
  step?: string;
  selector?: string;
  region?: Region;
}

export interface Rules {
  methods?: ('GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[];
  forms?: boolean;
  robots_txt?: 'honour' | 'ignore';
  min_interval_ms?: number;
  max_pages?: number;
}

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
  rules?: Rules;
  categories?: Category[];
  out?: { findings: string; evidence_dir: string };
}

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
  description: string;
  evidence?: Evidence[];
  confidence: number;
  repro?: string[];
  detected_at_s?: number;
  check?: string;
}

export interface FindingsFile {
  episode_id: string;
  system: { name: string; version: string };
  findings: Finding[];
  cost?: { model_usd?: number; compute_usd?: number; human_hours?: number; human_rate_usd_per_hour?: number; notes?: string };
  wall_time_s?: number;
  started_at?: string;
  finished_at?: string;
  notes?: string;
}

export const CATEGORIES: readonly Category[] = [
  'functional', 'consistency', 'permission', 'error-handling', 'visual', 'copy',
  'a11y', 'perf', 'usability', 'email', 'security-hygiene', 'l10n',
];
