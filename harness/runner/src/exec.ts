// Process execution for the runner. Everything goes through an `Exec` so unit tests can run the runner's whole
// flow against a fake docker, and so argv (never a shell string) is the only interface: no quoting bugs, and no
// secret ever appears on a command line (env values are passed by name, see docker.ts).
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';

export interface ExecOptions {
  cwd?: string;
  /** Full environment for the child (the runner always passes a minimal one). */
  env?: NodeJS.ProcessEnv;
  /** Kill after this long; `onTimeout` runs first (e.g. `docker kill`). */
  timeoutMs?: number;
  onTimeout?: () => Promise<unknown> | unknown;
  /** Stream stdout and stderr to this file instead of collecting them. */
  logFile?: string;
}

export interface ExecResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  /** Set when the process could not be started at all. */
  error?: string;
}

export type Exec = (cmd: string, args: string[], opts?: ExecOptions) => Promise<ExecResult>;

const MAX_CAPTURE = 1 << 20;

export const realExec: Exec = (cmd, args, opts = {}) =>
  new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    const log = opts.logFile ? createWriteStream(opts.logFile, { flags: 'a', mode: 0o644 }) : undefined;
    // stdin is closed: nothing the runner starts may wait on a terminal.
    const child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env ?? process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    const take = (which: 'out' | 'err') => (chunk: Buffer) => {
      if (log) log.write(chunk);
      if (which === 'out' && stdout.length < MAX_CAPTURE) stdout += chunk.toString('utf8');
      if (which === 'err' && stderr.length < MAX_CAPTURE) stderr += chunk.toString('utf8');
    };
    child.stdout.on('data', take('out'));
    child.stderr.on('data', take('err'));
    let timer: NodeJS.Timeout | undefined;
    let hardKill: NodeJS.Timeout | undefined;
    if (opts.timeoutMs !== undefined) {
      timer = setTimeout(() => {
        timedOut = true;
        void Promise.resolve()
          .then(() => opts.onTimeout?.())
          .catch(() => undefined)
          .finally(() => {
            hardKill = setTimeout(() => child.kill('SIGKILL'), 10_000);
          });
      }, opts.timeoutMs);
    }
    const finish = (r: ExecResult): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (hardKill) clearTimeout(hardKill);
      if (log) log.end(() => resolve(r));
      else resolve(r);
    };
    child.on('error', (e) => finish({ code: null, stdout, stderr, timedOut, error: e.message }));
    child.on('close', (code) => finish({ code, stdout, stderr, timedOut }));
  });
