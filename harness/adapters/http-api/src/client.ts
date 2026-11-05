// Thin HTTP client for the bench's run API (README.md describes it; a system under test serves it).
// It has exactly three calls: start a run, read its status, read its findings. There is deliberately no call that
// promotes journeys, approves baselines or edits the system's configuration.
import type { SystemFinding, RunRequest, RunStatus } from './map.ts';

export interface SystemApi {
  startRun(req: RunRequest): Promise<{ id: string }>;
  getRun(id: string): Promise<RunStatus>;
  getFindings(id: string): Promise<SystemFinding[]>;
}

export const PATHS = {
  start: '/api/runs',
  status: (id: string) => `/api/runs/${encodeURIComponent(id)}`,
  findings: (id: string) => `/api/runs/${encodeURIComponent(id)}/findings`,
} as const;

type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) =>
  Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;

export function httpApi(baseUrl: string, token: string | undefined, fetchImpl: FetchLike = fetch as unknown as FetchLike): SystemApi {
  const base = baseUrl.replace(/\/+$/, '');
  const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetchImpl(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!res.ok) {
      // Never echo the token; the body is the system's error text.
      const text = (await res.text().catch(() => '')).slice(0, 500);
      throw new Error(`${method} ${path} → HTTP ${res.status}${text ? `: ${text}` : ''}`);
    }
    return (await res.json()) as T;
  }

  return {
    startRun: (req) => call<{ id: string }>('POST', PATHS.start, req),
    getRun: (id) => call<RunStatus>('GET', PATHS.status(id)),
    getFindings: async (id) => {
      const body = await call<{ findings?: SystemFinding[] } | SystemFinding[]>('GET', PATHS.findings(id));
      return Array.isArray(body) ? body : (body.findings ?? []);
    },
  };
}
