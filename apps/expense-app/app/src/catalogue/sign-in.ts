import type { Role } from '../db.js';
import { FixtureError } from './entry.js';
import type { TestIdentity } from './identity.js';

/** Minimal browser seam. Harness-owned only: credentials never become operation steps. */
export interface SignInBrowser {
  goto(path: string): Promise<void>;
  fill(target: { label: string }, value: string): Promise<void>;
  click(target: { role: string; name: string }): Promise<void>;
  waitFor(until: { url: string }, timeoutMs: number): Promise<void>;
  extract(target: { testId: string }, mode: 'text'): Promise<unknown>;
}
/** Fresh authentication only. Partial/expired/wrong-user sessions are never reused or retried. */
export async function signIn<T extends SignInBrowser>(role: Role, browser: T, identity: TestIdentity, signal?: AbortSignal): Promise<T> {
  const check = (): void => {
    signal?.throwIfAborted();
    if (identity.role !== role || identity.expiresAt <= Date.now()) throw new FixtureError('IDENTITY', 'Sign-in identity is expired or has the wrong role');
  };
  check();
  try {
    await browser.goto('/login'); check();
    await browser.fill({ label: 'Username' }, identity.username); check();
    await browser.fill({ label: 'Password' }, identity.password); check();
    await browser.click({ role: 'button', name: 'Sign in' }); check();
    await browser.waitFor({ url: '/expenses' }, 5000); check();
    const account = await browser.extract({ testId: 'session-account' }, 'text'); check();
    const actualRole = await browser.extract({ testId: 'session-role' }, 'text'); check();
    if (account !== identity.username || actualRole !== role) throw new FixtureError('IDENTITY', 'Signed-in account or role differs from the intended fixture identity');
    return browser;
  } catch (cause) {
    if (signal?.aborted) { signal.throwIfAborted(); }
    if (cause instanceof FixtureError) throw cause;
    throw new FixtureError('IDENTITY', 'Fresh fixture sign-in failed; partial session must be discarded');
  }
}
