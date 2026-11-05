// The adapter's control flow, separated from I/O so it can be unit-tested with a fake API.
import type { SystemApi } from './client.ts';
import { isLocalApi, toCost, toFinding, toRunRequest, type RunStatus } from './map.ts';
import type { Brief, FindingsFile } from './types.ts';

/** Who is being scored. The system names itself through QA_SYSTEM_NAME / QA_SYSTEM_VERSION. */
export const DEFAULT_SYSTEM = { name: 'http-api', version: 'adapter-0.1.0' };

export interface RunOptions {
  apiUrl?: string;
  token?: string;
  project?: string;
  system?: { name: string; version: string };
  approved?: boolean;
  pollMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  makeApi: (apiUrl: string, token: string | undefined) => SystemApi;
}

export interface RunResult { findings: FindingsFile; ok: boolean }

export async function runAdapter(brief: Brief, opts: RunOptions): Promise<RunResult> {
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const started = now();
  const base: FindingsFile = { episode_id: brief.episode_id, system: opts.system ?? DEFAULT_SYSTEM, findings: [], started_at: new Date(started).toISOString() };
  const finish = (ok: boolean, extra: Partial<FindingsFile>): RunResult => {
    const end = now();
    return { ok, findings: { ...base, ...extra, wall_time_s: Math.round((end - started) / 100) / 10, finished_at: new Date(end).toISOString() } };
  };

  if (!opts.apiUrl) return finish(false, { notes: 'QA_SYSTEM_API_URL is not set; nothing was run' });
  if (!isLocalApi(opts.apiUrl) && !opts.approved) {
    return finish(false, { notes: 'Refused: a remote system needs the owner\'s go-ahead and a spend cap (set QA_BENCH_REMOTE_APPROVED=1)' });
  }

  const api = opts.makeApi(opts.apiUrl, opts.token);
  const deadline = started + brief.budget.wall_time_s * 1000;
  let runId: string;
  try {
    runId = (await api.startRun(toRunRequest(brief, opts.project))).id;
  } catch (e) {
    return finish(false, { notes: `Could not start a run: ${(e as Error).message}` });
  }

  let status: RunStatus | undefined;
  for (;;) {
    try {
      status = await api.getRun(runId);
    } catch (e) {
      return finish(false, { notes: `Lost run ${runId}: ${(e as Error).message}` });
    }
    if (status.status === 'done' || status.status === 'failed' || status.status === 'cancelled') break;
    if (now() >= deadline) break;
    await sleep(opts.pollMs ?? 5000);
  }

  const timedOut = !['done', 'failed', 'cancelled'].includes(status.status);
  let raw: Awaited<ReturnType<SystemApi['getFindings']>>;
  try {
    raw = await api.getFindings(runId);
  } catch (e) {
    return finish(false, { cost: toCost(status), notes: `Run ${runId} ended (${status.status}) but its findings could not be read: ${(e as Error).message}` });
  }
  const runStart = status.started_at ? Date.parse(status.started_at) : started;
  const findings = raw.map((t, i) => toFinding(t, i, Number.isFinite(runStart) ? runStart : started));
  const notes = [`run ${runId}: ${status.status}`];
  if (timedOut) notes.push('budget reached before the run finished; findings so far');
  if (status.error) notes.push(`error: ${status.error}`);
  return finish(status.status !== 'failed', { findings, cost: toCost(status), notes: notes.join('; ') });
}
