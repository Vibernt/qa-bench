import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { verifyFixtureTotp } from './totp.js';
import type { AuthAccount, AuthLifecycleOptions } from './types.js';

export type { AuthLifecycleOptions } from './types.js';
interface Challenge { username: string; expiresAt: number; account?: AuthAccount; token?: string }
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const cookie = (req: IncomingMessage) => req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith('auth_challenge='))?.slice(15);

export class AuthLifecycle {
  private readonly pending = new Map<string, Challenge>();
  readonly now: () => number;
  readonly ttlMs: number;
  private readonly challengeTtlMs: number;
  constructor(readonly options: AuthLifecycleOptions) {
    if (!['multi-step', 'totp', 'magic-link'].includes(options.mode) || !options.tenant) throw new Error('Invalid auth-lifecycle mode or tenant');
    this.now = options.now ?? Date.now;
    this.ttlMs = options.ttlMs ?? 60_000;
    this.challengeTtlMs = options.challengeTtlMs ?? 30_000;
    for (const value of [this.ttlMs, this.challengeTtlMs]) if (!Number.isSafeInteger(value) || value < 1 || value > 300_000) throw new Error('Auth-lifecycle TTL must be 1..300000 ms');
    if (options.mode === 'totp' && (!options.totpSecret || options.totpSecret.length < 20)) throw new Error('Auth-lifecycle TOTP requires host fixture secret bytes (at least 20)');
    if (options.mode === 'magic-link' && !options.mailSink) throw new Error('Auth-lifecycle magic link requires a host fixture mail sink');
  }
  clear(): void { this.pending.clear(); if (this.options.mailSink) this.options.mailSink.length = 0; }

  async handle(req: IncomingMessage, res: ServerResponse, path: string,
    authenticate: (username: string, password: string) => AuthAccount | undefined,
    complete: (account: AuthAccount) => void,
    identity: () => AuthAccount | undefined): Promise<boolean> {
    if (!['/login', '/auth/password', '/auth/verify', '/auth/identity'].includes(path)) return false;
    const html = (status: number, title: string, body: string) => {
      res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(`<!doctype html><html lang="en"><title>${title}</title><main><h1>${title}</h1>${body}</main></html>`);
    };
    const form = (action: string, field: string, label: string, type = 'text') => `<form method="post" action="${action}"><label>${label} <input name="${field}" type="${type}" required></label><button type="submit">Continue</button></form>`;
    if (path === '/auth/identity' && req.method === 'GET') {
      const account = identity();
      res.writeHead(account ? 200 : 401, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify(account ? { complete: true, account: account.username, role: account.role, tenant: this.options.tenant, expiresAt: account.expiresAt } : { complete: false }));
      return true;
    }
    if (path === '/login' && req.method === 'GET') { html(200, 'Sign in', form('/login', 'username', 'Username')); return true; }
    if (req.method !== 'POST') { html(405, 'Method not allowed', 'Use the sign-in form'); return true; }
    // Expired attempts are discarded, never restored into a completed session.
    for (const [id, challenge] of this.pending) if (challenge.expiresAt <= this.now()) this.pending.delete(id);
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of req) {
      size += Buffer.byteLength(chunk);
      if (size > 8192) { html(413, 'Request too large', 'Sign in again'); return true; }
      chunks.push(Buffer.from(chunk));
    }
    const values = new URLSearchParams(Buffer.concat(chunks).toString());
    if (path === '/login') {
      const previous = cookie(req); if (previous) this.pending.delete(previous);
      const username = values.get('username');
      if (!username || username.length > 128 || this.pending.size >= 100) { html(400, 'Sign in rejected', 'Start a new sign-in'); return true; }
      const id = randomBytes(24).toString('hex');
      this.pending.set(id, { username, expiresAt: this.now() + this.challengeTtlMs });
      res.setHeader('set-cookie', `auth_challenge=${id}; HttpOnly; SameSite=Strict; Path=/auth`);
      html(200, 'Password', form('/auth/password', 'password', 'Password', 'password')); return true;
    }
    const id = cookie(req); const challenge = id ? this.pending.get(id) : undefined;
    if (id) this.pending.delete(id); // every submitted step consumes its prior state, including failures
    if (!challenge) { html(401, 'Sign in expired', 'Start a new sign-in'); return true; }
    if (path === '/auth/password' && !challenge.account) {
      const account = authenticate(challenge.username, values.get('password') ?? '');
      if (!account) { html(401, 'Invalid credentials', 'Start a new sign-in'); return true; }
      if (this.options.mode === 'multi-step') { complete(account); return true; }
      challenge.account = account;
      if (this.options.mode === 'magic-link') {
        challenge.token = randomBytes(32).toString('hex');
        this.options.mailSink!.push({ account: account.username, token: challenge.token, expiresAt: challenge.expiresAt });
      }
      this.pending.set(id!, challenge);
      html(200, 'Verify sign in', form('/auth/verify', 'code', this.options.mode === 'totp' ? 'Verification code' : 'Magic link token')); return true;
    }
    if (path === '/auth/verify' && challenge.account) {
      const code = values.get('code') ?? '';
      const valid = this.options.mode === 'totp'
        ? verifyFixtureTotp(this.options.totpSecret!, code, this.now())
        : Boolean(challenge.token && /^[a-f0-9]{64}$/.test(code) && timingSafeEqual(Buffer.from(code), Buffer.from(challenge.token)));
      if (valid) { complete(challenge.account); return true; }
    }
    html(401, 'Verification rejected', 'Start a new sign-in'); return true;
  }
}
