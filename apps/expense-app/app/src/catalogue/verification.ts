import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { FixtureError } from './entry.js';

export interface FixtureIdentity { version: string; dbDigest: string; catalogueDigest: string }
export interface ResetEvidence extends FixtureIdentity {
  sessions: number; cache: number; pendingJobs: number; mail: readonly unknown[];
}
export function digest(bytes: string | Uint8Array): string { return `sha256:${createHash('sha256').update(bytes).digest('hex')}`; }
export function databaseDigest(path: string): string { return digest(readFileSync(path)); }
/** Missing identity or counters are failures, never interpreted as empty state. */
export function verifyReset(actual: ResetEvidence, expected: FixtureIdentity): void {
  if (!actual || !expected || !expected.version || !/^sha256:[a-f0-9]{64}$/.test(expected.dbDigest) ||
    !/^sha256:[a-f0-9]{64}$/.test(expected.catalogueDigest) || actual.version !== expected.version ||
    actual.dbDigest !== expected.dbDigest || actual.catalogueDigest !== expected.catalogueDigest ||
    actual.sessions !== 0 || actual.cache !== 0 || actual.pendingJobs !== 0 || !Array.isArray(actual.mail) || actual.mail.length !== 0) {
    throw new FixtureError('RESET', 'Fixture reset evidence is missing, stale, wrong-version or dirty');
  }
}
