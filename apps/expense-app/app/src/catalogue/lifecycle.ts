import { signIn, type SignInBrowser } from './sign-in.js';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { seed, type Role } from '../db.js';
import { createServer } from '../server.js';
import { FixtureIsolation } from '../isolation.js';
import { parseCatalogueEntry, FixtureError, type CatalogueEntry } from './entry.js';
import { FixtureIdentities, type TestIdentity } from './identity.js';
import { databaseDigest, digest, verifyReset, type FixtureIdentity, type ResetEvidence } from './verification.js';
import { readExpenseEvidence } from './evidence.js';

/** One owned DB and server per run. Callers must serialize lifecycle with operation dispatch. */
export class ExpenseFixture {
  private server: Server | undefined;
  private isolation: FixtureIsolation | undefined;
  private readonly identities: FixtureIdentities;
  private state: 'idle' | 'active' | 'busy' | 'closed' | 'faulted' = 'idle';
  private currentOrigin: string | undefined;
  private constructor(readonly entry: Readonly<CatalogueEntry>, readonly directory: string,
    readonly dbPath: string, readonly expected: Readonly<FixtureIdentity>) {
    this.identities = new FixtureIdentities(entry.roles);
  }

  /** Allocates only below an existing, host-selected work directory; entries contain no paths. */
  static async create(input: unknown, workDirectory: string): Promise<ExpenseFixture> {
    const entry = parseCatalogueEntry(input);
    let directory: string;
    try { directory = await mkdtemp(join(await realpath(workDirectory), 'expense-')); }
    catch (cause) { throw new FixtureError('LIFECYCLE', 'Cannot allocate fixture below the configured work directory', { cause }); }
    const dbPath = join(directory, 'fixture.sqlite');
    try {
      ExpenseFixture.seedDatabase(dbPath, entry);
      const catalogueDigest = digest(JSON.stringify(Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key as keyof CatalogueEntry]]))));
      return new ExpenseFixture(entry, directory, dbPath, Object.freeze({ version: entry.version, dbDigest: databaseDigest(dbPath), catalogueDigest }));
    } catch (cause) {
      await rm(directory, { recursive: true, force: true });
      throw new FixtureError('LIFECYCLE', 'Fixture allocation failed', { cause });
    }
  }

  private static seedDatabase(path: string, entry: Readonly<CatalogueEntry>): void {
    seed(path);
    if (entry.idempotency) {
      const db = new DatabaseSync(path);
      try { db.exec('CREATE TABLE IF NOT EXISTS idempotency_keys (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, payload TEXT NOT NULL)'); }
      finally { db.close(); }
    }
  }

  get origin(): string {
    this.requireActive(); return this.currentOrigin!;
  }
  private requireActive(): void {
    if (this.state !== 'active') throw new FixtureError('STATE', `Fixture is ${this.state}`);
  }
  inspect(): ResetEvidence {
    this.requireActive();
    return { version: this.entry.version, dbDigest: databaseDigest(this.dbPath), catalogueDigest: this.expected.catalogueDigest, ...this.isolation!.inspect() };
  }
  issueIdentity(role: Role, ttlMs?: number): TestIdentity { this.requireActive(); return this.identities.issue(role, ttlMs); }
  /** Reviewed catalogue hook; returns the same browser with freshly verified session state. */
  async signIn<T extends SignInBrowser>(role: Role, browser: T, identity = this.issueIdentity(role), signal?: AbortSignal): Promise<T> {
    this.requireActive();
    const active = this.identities.authenticate(identity.username, identity.password);
    if (!this.entry.roles.includes(role) || !active || active.role !== role || identity.role !== role)
      throw new FixtureError('IDENTITY', 'Sign-in requires an active declared fixture identity');
    return signIn(role, browser, { ...identity, expiresAt: Math.min(identity.expiresAt, active.expiresAt) }, signal);
  }
  evidence(provider: string, args: Record<string, unknown>): unknown {
    this.requireActive(); return readExpenseEvidence(this.dbPath, provider, args);
  }

  async start(expected: FixtureIdentity = this.expected): Promise<ResetEvidence> {
    if (this.state !== 'idle') throw new FixtureError('STATE', `Cannot start fixture in ${this.state}`);
    this.state = 'busy';
    try { return await this.open(expected); }
    catch (cause) { return this.fail(cause); }
  }

  private async open(expected: FixtureIdentity): Promise<ResetEvidence> {
    // Check disk identity before opening SQLite, binding a port or accepting browser traffic.
    verifyReset({ version: this.entry.version, dbDigest: databaseDigest(this.dbPath), catalogueDigest: this.expected.catalogueDigest,
      sessions: 0, cache: 0, pendingJobs: 0, mail: [] }, expected);
    const isolation = new FixtureIsolation(this.directory, this.entry.delayedJobs, this.entry.mailSink);
    this.isolation = isolation;
    const server = createServer({ dbPath: this.dbPath, defect: this.entry.defect, variant: this.entry.variant,
      idempotency: this.entry.idempotency, isolation, authenticate: this.identities.authenticate });
    this.server = server;
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject); server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new FixtureError('LIFECYCLE', 'Fixture has no TCP address');
    this.currentOrigin = `http://127.0.0.1:${address.port}`;
    this.state = 'active';
    const report = this.inspect(); verifyReset(report, expected); return report;
  }

  private async stop(): Promise<void> {
    this.currentOrigin = undefined; this.identities.clear(); this.isolation?.reset();
    const server = this.server; this.server = undefined;
    if (server) await new Promise<void>((resolve, reject) => {
      // close() drains in-flight handlers before the DB close listener runs. No new dispatch is admitted.
      server.close(error => error ? reject(error) : resolve());
    });
  }
  private async fail(cause: unknown): Promise<never> {
    this.state = 'faulted'; await this.stop();
    if (cause instanceof FixtureError) throw cause;
    throw new FixtureError('LIFECYCLE', 'Fixture lifecycle failed', { cause });
  }

  async reset(expected: FixtureIdentity = this.expected): Promise<ResetEvidence> {
    this.requireActive(); this.state = 'busy';
    try {
      await this.stop();
      // Replace the database, rather than trusting DELETE to restore identical bytes.
      await rm(this.dbPath); ExpenseFixture.seedDatabase(this.dbPath, this.entry);
      return await this.open(expected);
    } catch (cause) { return this.fail(cause); }
  }

  async close(): Promise<void> {
    if (this.state === 'closed') return;
    if (this.state === 'busy') throw new FixtureError('STATE', 'Fixture lifecycle is busy');
    this.state = 'busy';
    try { await this.stop(); await rm(this.directory, { recursive: true, force: true }); this.state = 'closed'; }
    catch (cause) { this.state = 'faulted'; throw new FixtureError('LIFECYCLE', 'Fixture cleanup failed', { cause }); }
  }
}
