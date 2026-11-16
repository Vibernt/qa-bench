import { spawn } from 'node:child_process';
export interface ProcessResult { code: number; stdout: string; stderr: string }
export type Execute = (args: string[], cwd: string, timeoutMs: number) => Promise<ProcessResult>;
export const execute: Execute = (args, cwd, timeoutMs) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], timeout: timeoutMs, killSignal: 'SIGTERM' });
  let stdout = ''; let stderr = '';
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', s => { stdout += s; }); child.stderr.on('data', s => { stderr += s; });
  child.on('error', reject);
  child.on('close', code => resolve({ code: code ?? 3, stdout, stderr }));
});
