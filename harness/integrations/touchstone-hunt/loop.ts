import { join } from 'node:path';
import type { Brief } from '../../../lib/contracts.ts';
import { writeJson } from '../../../lib/io.ts';
import { HuntFailure, type Meter, type NativeResult } from '../../adapters/touchstone-hunt/src/native.ts';
import { redact } from '../../adapters/touchstone-hunt/src/privacy.ts';
export interface Session { brief: string; findings: string }
interface Ports {
  up(id: string): Promise<{ session: Session; brief: Brief }>;
  hunt(session: Session, maxUsd: number): Promise<NativeResult>;
  down(dir: string): Promise<void>;
  now?: () => number;
}
export interface EpisodeCost extends Meter { episode_id: string; status: string; reserved_usd: number; status_reason?: string }
function sum(rows: EpisodeCost[], key: keyof Meter): number | null {
  return rows.some(r => r[key] === null) ? null : rows.reduce((n, r) => n + r[key]!, 0);
}
/** Reserve per-episode ceilings, including unknown-cost failures, before starting another episode. */
export async function runHuntSet(ids: string[], runDir: string, opts: { maxUsd: number; totalUsd: number; live: boolean }, ports: Ports) {
  const now = ports.now ?? Date.now;
  const episodes: EpisodeCost[] = []; let reserved = 0; let completed = 0;
  for (const id of ids) {
    const dir = join(runDir, id); const remaining = opts.totalUsd - reserved;
    if (opts.live && remaining <= 1e-9) {
      writeJson(join(dir, 'runner.json'), { episode_id: id, status: 'skipped', status_reason: 'Total model USD cap reserved or exhausted' });
      episodes.push({ episode_id: id, status: 'skipped', model_usd: 0, calls: 0, tokens: 0, wall_seconds: 0, reserved_usd: 0 });
      continue;
    }
    const cap = Math.min(opts.maxUsd, remaining);
    const start = now(); let brief: Brief | undefined; let started = false; let result: NativeResult | undefined;
    const errors: string[] = [];
    let cost: Meter = { model_usd: 0, calls: 0, tokens: 0, wall_seconds: 0 };
    try {
      const up = await ports.up(id); brief = up.brief; started = true;
      try { result = await ports.hunt(up.session, cap); cost = result.cost; }
      catch (error) {
        cost = error instanceof HuntFailure ? error.cost : { model_usd: null, calls: null, tokens: null, wall_seconds: 0 };
        throw error;
      }
    } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    finally {
      if (started) {
        try { await ports.down(dir); }
        catch (error) { errors.push(`Teardown failed: ${error instanceof Error ? error.message : String(error)}`); }
      }
    }
    const liability = opts.live ? (cost.model_usd === null ? cap : Math.max(0, cost.model_usd)) : 0;
    if (liability > cap + 1e-9) errors.push('CLI reported model usage above reserved episode cap');
    const status = errors.length ? 'adapter_error' : result?.planOnly ? 'skipped' : 'scored';
    const reason = errors.length ? redact(errors.join('\n'), brief) : result?.planOnly ? 'Plan only; no model calls or score' : undefined;
    reserved += liability;
    const row: EpisodeCost = { ...cost, wall_seconds: (now() - start) / 1000, episode_id: id, status, reserved_usd: liability, ...(reason ? { status_reason: reason } : {}) };
    episodes.push(row);
    writeJson(join(dir, 'runner.json'), { episode_id: id, status, ...(reason ? { status_reason: reason } : {}), wall_time_s: row.wall_seconds });
    if (status === 'scored') completed++;
    // Checkpoint after every episode, including paid failures.
    writeJson(join(runDir, 'cost.json'), { episodes, total: { model_usd: sum(episodes, 'model_usd'), calls: sum(episodes, 'calls'), tokens: sum(episodes, 'tokens'), wall_seconds: sum(episodes, 'wall_seconds'), reserved_usd: reserved }, max_usd: opts.totalUsd });
  }
  const cost = { episodes, total: { model_usd: sum(episodes, 'model_usd'), calls: sum(episodes, 'calls'), tokens: sum(episodes, 'tokens'), wall_seconds: sum(episodes, 'wall_seconds'), reserved_usd: reserved }, max_usd: opts.totalUsd };
  writeJson(join(runDir, 'cost.json'), cost);
  return { completed, cost };
}
