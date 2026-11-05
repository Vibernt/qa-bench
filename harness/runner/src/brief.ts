// The brief: the only thing an adapter is told about an episode (BRIEF §6.4). Built from app.yaml, the track and
// the episode's generated accounts. It never contains anything from the answer key, episode.active or the
// episode's env (switch keys or values).
import type { AppConfig, Brief, Category, Episode, Track } from '../../../lib/contracts.ts';
import { assertValid } from '../../../lib/schemas.ts';
import { BENCH_EVIDENCE_DIR, BENCH_FINDINGS_FILE } from './docker.ts';

export const DEFAULT_WALL_TIME_S = 600;

export interface BriefInput {
  episode: Episode;
  /** Undefined for live episodes. */
  app?: AppConfig;
  /** The episode's track, when its file is known (budget, journeys, goal). */
  track?: Track;
  /** Resolved target URLs, in app.yaml target order. */
  targets: { name: string; url: string }[];
  /** Track-level category scope (identical for every episode of the track). */
  categories?: Category[];
}

export function buildBrief(input: BriefInput): Brief {
  const { episode, app, track } = input;
  const tb = track?.brief ?? {};
  const roles = (app?.roles ?? []).map((r) => ({
    role: r.role,
    accounts: episode.accounts.filter((a) => a.role === r.role).map((a) => ({ username: a.username, password: a.password })),
  }));
  const brief: Brief = {
    episode_id: episode.id,
    bench_version: episode.bench_version,
    app: episode.app,
    track: episode.track,
    targets: input.targets,
    roles,
    budget: { wall_time_s: tb.wall_time_s ?? DEFAULT_WALL_TIME_S, ...(tb.money_usd !== undefined ? { money_usd: tb.money_usd } : {}) },
  };
  if (tb.journeys && app?.journeys?.length) {
    brief.journeys = app.journeys.map((j) => ({ id: j.id, title: j.title, role: j.role, ...(j.start ? { start: j.start } : {}), steps: [...j.steps] }));
  }
  if (tb.goal) brief.goal = tb.goal;
  const pages = episode.live ? episode.live.pages : app?.pages;
  if (pages?.length) brief.pages = [...pages];
  if (episode.live) brief.rules = { ...episode.live.rules };
  if (input.categories?.length) brief.categories = [...input.categories];
  brief.out = { findings: BENCH_FINDINGS_FILE, evidence_dir: BENCH_EVIDENCE_DIR };
  return assertValid<Brief>('brief', brief, `${episode.id}/brief.json`);
}
