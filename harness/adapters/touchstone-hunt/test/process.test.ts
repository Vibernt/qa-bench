import { EventEmitter } from 'node:events';
import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock('node:child_process', () => ({ spawn: mocks.spawn }));
import { execute } from '../src/process.ts';
function child() {
  const c = Object.assign(new EventEmitter(), { stdout: Object.assign(new EventEmitter(), { setEncoding: vi.fn() }), stderr: Object.assign(new EventEmitter(), { setEncoding: vi.fn() }) });
  mocks.spawn.mockReturnValue(c); return c;
}
it('spawns only Node with exact argument vector, private cwd, finite timeout and no shell, preserving failure output', async () => {
  const c = child(); const result = execute(['entry.mjs', '--model', 'anthropic:model'], '/private-output', 60000);
  expect(mocks.spawn).toHaveBeenLastCalledWith(process.execPath, ['entry.mjs', '--model', 'anthropic:model'], { cwd: '/private-output', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000, killSignal: 'SIGTERM' });
  c.stdout.emit('data', 'plan'); c.stderr.emit('data', 'refusal'); c.emit('close', 2);
  await expect(result).resolves.toEqual({ code: 2, stdout: 'plan', stderr: 'refusal' });
});
it('propagates spawn errors without retry', async () => {
  const c = child(); const result = execute([], '/private-output', 1000); c.emit('error', new Error('spawn refused'));
  await expect(result).rejects.toThrow('spawn refused');
});
it('treats signal termination as an infrastructure failure', async () => {
  const c = child(); const result = execute([], '/private-output', 1000); c.emit('close', null); await expect(result).resolves.toMatchObject({ code: 3 });
});
