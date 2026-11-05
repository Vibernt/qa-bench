// The adapter's control flow, separated from I/O so it can be unit-tested with a fake API.
import type { TouchstoneApi } from './client.ts';
import { isLocalApi, toCost, toFinding, toRunRequest, type TouchstoneRunStatus } from './map.ts';
import type { Brief, FindingsFile } from './types.ts';

export const SYSTEM = { name: 'touchstone', version: 'adapter-0.1.0' };

export interface RunOptions {
  apiUrl?: string;
  token?: string;
  project?: string;
  approved?: boolean;
  pollMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  makeApi: (apiUrl: string, token: string | undefined) => TouchstoneApi;
}

export interface RunResult { findings: FindingsFile; ok: boolean }

export async function runAdapter(brief: Brief, opts: RunOptions): Promise<RunResult> {
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const started = now();
  const base: FindingsFile = { episode_id: brief.episode_id, system: SYSTEM, findings: [], started_at: new Date(started).toISOString() };
  const finish = (ok: boolean, extra: Partial<FindingsFile>): RunResult => {
    const end = now();
    return { ok, findings: { ...base, ...extra, wall_time_s: Math.round((end - started) / 100) / 10, finished_at: new Date(end).toISOString() } };
  };

  if (!opts.apiUrl) return finish(false, { notes: 'TOUCHSTONE_API_URL is not set; nothing was run' });
  if (!isLocalApi(opts.apiUrl) && !opts.approved) {
    return finish(false, { notes: 'Refused: a non-local Touchstone needs the owner\'s go-ahead and BD4 (set QA_BENCH_TOUCHSTONE_APPROVED=1)' });
  }

  const api = opts.makeApi(opts.apiUrl, opts.token);
  const deadline = started + brief.budget.wall_time_s * 1000;
  let runId: string;
  try {
    runId = (await api.startRun(toRunRequest(brief, opts.project))).id;
  } catch (e) {
    return finish(false, { notes: `Could not start a Touchstone run: ${(e as Error).message}` });
  }

  let status: TouchstoneRunStatus | undefined;
  for (;;) {
    try {
      status = await api.getRun(runId);
    } catch (e) {
      return finish(false, { notes: `Lost the Touchstone run ${runId}: ${(e as Error).message}` });
    }
    if (status.status === 'done' || status.status === 'failed' || status.status === 'cancelled') break;
    if (now() >= deadline) break;
    await sleep(opts.pollMs ?? 5000);
  }

  const timedOut = !['done', 'failed', 'cancelled'].includes(status.status);
  let raw: Awaited<ReturnType<TouchstoneApi['getFindings']>>;
  try {
    raw = await api.getFindings(runId);
  } catch (e) {
    return finish(false, { cost: toCost(status), notes: `Run ${runId} ended (${status.status}) but its findings could not be read: ${(e as Error).message}` });
  }
  const runStart = status.started_at ? Date.parse(status.started_at) : started;
  const findings = raw.map((t, i) => toFinding(t, i, Number.isFinite(runStart) ? runStart : started));
  const notes = [`Touchstone run ${runId}: ${status.status}`];
  if (timedOut) notes.push('budget reached before the run finished; findings so far');
  if (status.error) notes.push(`error: ${status.error}`);
  return finish(status.status !== 'failed', { findings, cost: toCost(status), notes: notes.join('; ') });
}
