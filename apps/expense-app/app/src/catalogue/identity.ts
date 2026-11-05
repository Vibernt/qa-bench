import { randomBytes } from 'node:crypto';
import type { Role } from '../db.js';
import { FixtureError } from './entry.js';

export interface TestIdentity { username: string; password: string; role: Role; expiresAt: number }
export class FixtureIdentities {
  private readonly entries = new Map<string, TestIdentity>();
  constructor(private readonly roles: readonly Role[]) {}
  issue(role: Role, ttlMs = 60_000): TestIdentity {
    if (!this.roles.includes(role) || !Number.isSafeInteger(ttlMs) || ttlMs < 1 || ttlMs > 300_000) {
      throw new FixtureError('IDENTITY', 'Role must be declared and identity TTL must be 1..300000 ms');
    }
    for (const [key, value] of this.entries) if (value.expiresAt <= Date.now()) this.entries.delete(key);
    const identity = { role, username: `test-${randomBytes(16).toString('hex')}`, password: randomBytes(32).toString('hex'), expiresAt: Date.now() + ttlMs };
    this.entries.set(identity.username, identity); return { ...identity };
  }
  readonly authenticate = (username: string, password: string) => {
    const identity = this.entries.get(username);
    if (!identity || identity.password !== password) return undefined;
    if (identity.expiresAt <= Date.now()) { this.entries.delete(username); return undefined; }
    return { id: identity.role === 'viewer' ? 1 : 2, username, role: identity.role, expiresAt: identity.expiresAt };
  };
  clear(): void { this.entries.clear(); }
}
