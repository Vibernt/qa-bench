import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createDatabase, findExpense, findUser, verifyPassword, type Expense, type Role } from './db.js';
import { variantLabels, type Variant } from './variant.js';
import { FixtureError } from './catalogue/entry.js';
import { hostileRoute } from './hostile.js';
import type { FixtureIsolation } from './isolation.js';
import { AuthLifecycle, type AuthLifecycleOptions } from './auth-lifecycle/routes.js';

export type Defect =
  | 'missing_persistence'
  | 'duplicate_write'
  | 'misleading_success'
  | 'permission_bypass'
  | 'ignored_filter'
  | 'wrong_total'
  | 'stale_state'
  | '';

export interface ServerOptions {
  dbPath: string;
  /** Legacy S1 alias; absent preserves existing behavior. */
  experimentalIsolation?: FixtureIsolation;
  /** Reviewed catalogue lifecycle; defaults remain unchanged. */
  isolation?: FixtureIsolation;
  authenticate?: (username: string, password: string) => { id: number; username: string; role: Role; expiresAt: number } | undefined;
  defect?: Defect;
  variant?: Variant;
  /** Reviewed idempotency and commit barrier opt-ins; disabled by default. */
  idempotency?: boolean;
  afterCreateCommit?: () => Promise<void>;
  /** Auth-lifecycle probe only; absent leaves the released authentication routes unchanged. */
  authLifecycle?: AuthLifecycleOptions;
}

interface Session {
  userId: number;
  username: string;
  role: Role;
  expiresAt?: number;
  displayName?: string;
}

interface CachedList {
  rows: Expense[];
  expiresAt: number;
}

const categories = ['travel', 'meals', 'office'];
const cookieName = 'expense_session';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><main><h1>${escapeHtml(title)}</h1>${body}</main></body></html>`;
}

function sendHtml(response: ServerResponse, status: number, html: string): void {
  response.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  response.end(html);
}

function redirect(response: ServerResponse, location: string): void {
  response.writeHead(303, { location, 'cache-control': 'no-store' });
  response.end();
}

async function readForm(request: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function parseAmount(value: string): number | undefined {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : undefined;
}

function forbidden(response: ServerResponse): void {
  sendHtml(response, 403, page('Forbidden', '<p>Forbidden</p>'));
}

function loginPage(error = false): string {
  const alert = error ? '<p role="alert">Invalid credentials</p>' : '';
  return page('Sign in', `${alert}<form method="post" action="/login">
    <label>Username <input name="username" autocomplete="username" required></label>
    <label>Password <input name="password" type="password" autocomplete="current-password" required></label>
    <button type="submit">Sign in</button>
  </form>`);
}

function expenseForm(expense?: Expense, variant: Variant = '', token = ''): string {
  const labels = variantLabels(variant);
  const editing = expense !== undefined;
  const action = editing ? `/expenses/${expense.id}` : '/expenses';
  const fields = `<label>${labels.title} <input name="title" value="${escapeHtml(expense?.title ?? '')}" required></label>
    <label>Category <select name="category" aria-label="Category">${categories.map((category) =>
      `<option value="${category}"${expense?.category === category ? ' selected' : ''}>${category}</option>`).join('')}</select></label>
    <label>Amount <input name="amount" type="number" min="0" step="0.01" value="${expense ? (expense.amount_cents / 100).toFixed(2) : ''}" required></label>`;
  return page(editing ? 'Edit expense' : labels.add, `<form method="post" action="${action}">${fields}${token ? `<input type="hidden" name="idempotency_token" value="${escapeHtml(token)}">` : ''}<button type="submit">${labels.save}</button></form>`);
}

function cookieValue(request: IncomingMessage): string | undefined {
  const cookie = request.headers.cookie;
  if (!cookie) return undefined;
  for (const part of cookie.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === cookieName) return value.join('=');
  }
  return undefined;
}

export function createServer(options: ServerOptions): Server {
  if (options.isolation && options.experimentalIsolation) throw new FixtureError('STATE', 'Supply only one isolation capability');
  const authLifecycle = options.authLifecycle ? new AuthLifecycle(options.authLifecycle) : undefined;
  const db: DatabaseSync = createDatabase(options.dbPath);
  const defect = options.defect ?? '';
  const variant = options.variant ?? '';
  const labels = variantLabels(variant);
  const idempotency = options.idempotency ?? process.env.IDEMPOTENCY === '1';
  if (idempotency) db.exec('CREATE TABLE IF NOT EXISTS idempotency_keys (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, payload TEXT NOT NULL)');
  const isolation = options.isolation ?? options.experimentalIsolation;
  const sessions = new Map<string, Session>();
  const listCache = new Map<string, CachedList>();
  isolation?.bind(() => { sessions.clear(); listCache.clear(); authLifecycle?.clear(); },
    () => ({ sessions: sessions.size, cache: listCache.size }));

  function currentSession(request: IncomingMessage): Session | undefined {
    const token = cookieValue(request);
    const session = token ? sessions.get(token) : undefined;
    if (session && (authLifecycle?.options.invalidSession || (session.expiresAt !== undefined && session.expiresAt <= (authLifecycle?.now() ?? Date.now())))) {
      sessions.delete(token!); return undefined;
    }
    if (session && authLifecycle?.options.changedRole) session.role = authLifecycle.options.changedRole;
    return session;
  }

  function requireEditor(request: IncomingMessage, response: ServerResponse, allowPermissionBypass = false): Session | undefined {
    const session = currentSession(request);
    if (!session) {
      redirect(response, '/login');
      return undefined;
    }
    if (session.role !== 'editor' && !(allowPermissionBypass && defect === 'permission_bypass')) {
      forbidden(response);
      return undefined;
    }
    return session;
  }

  function loadExpenses(category: string): Expense[] {
    const cacheKey = category;
    const cached = listCache.get(cacheKey);
    if (defect === 'stale_state' && cached && cached.expiresAt > Date.now()) return cached.rows;
    const effectiveCategory = defect === 'ignored_filter' ? '' : category;
    const rows = (effectiveCategory
      ? db.prepare('SELECT id, title, category, amount_cents, created_by, updated_at FROM expenses WHERE category = ? ORDER BY id').all(effectiveCategory)
      : db.prepare('SELECT id, title, category, amount_cents, created_by, updated_at FROM expenses ORDER BY id').all()) as unknown as Expense[];
    if (defect === 'stale_state') listCache.set(cacheKey, { rows, expiresAt: Date.now() + 60_000 });
    return rows;
  }

  function renderList(request: IncomingMessage, response: ServerResponse, url: URL, flash = ''): void {
    const session = currentSession(request);
    if (!session) {
      redirect(response, '/login');
      return;
    }
    const category = url.searchParams.get('category') ?? '';
    const rows = loadExpenses(category);
    const totalRows = defect === 'wrong_total' ? rows.slice(0, -1) : rows;
    const total = totalRows.reduce((sum, row) => sum + row.amount_cents, 0);
    const tableRows = rows.map((row) => `<tr><td>${escapeHtml(row.title)}</td><td>${escapeHtml(row.category)}</td><td>${formatMoney(row.amount_cents)}</td><td>${session.role === 'editor' ? `<a href="/expenses/${row.id}/edit">Edit</a><form method="post" action="/expenses/${row.id}/delete"><button type="submit">Delete</button></form>` : ''}</td></tr>`).join('');
    const editorLinks = session.role === 'editor' ? `<p><a href="/expenses/new">${labels.add}</a></p>` : '';
    const status = flash ? `<p role="status">${escapeHtml(flash)}</p>` : '';
    const html = page('Expenses', `${status}${options.authenticate || authLifecycle ? `<span data-testid="session-account">${escapeHtml(session.username)}</span><span data-testid="session-role">${session.role}</span>` : ''}<p>Signed in as ${escapeHtml(session.displayName ?? session.username)}</p>
      ${authLifecycle ? `<p data-testid="session-identity" data-account="${escapeHtml(session.username)}" data-role="${session.role}" data-tenant="${escapeHtml(authLifecycle.options.tenant)}">Account: ${escapeHtml(session.username)}; Role: ${session.role}</p>` : ''}
      <form method="get" action="/expenses"><label>Category <select aria-label="Category" name="category"><option value="">All categories</option>${categories.map((value) => `<option value="${value}"${category === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label><button type="submit">Apply</button></form>
      <table aria-label="Expenses"><thead><tr><th>Title</th><th>Category</th><th>Amount</th><th>Actions</th></tr></thead><tbody>${tableRows}</tbody></table>
      <p data-testid="total">Total: ${formatMoney(total)}</p>${editorLinks}<form method="post" action="/logout"><button type="submit">Sign out</button></form>`);
    sendHtml(response, 200, html);
  }

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const path = url.pathname;
    if (authLifecycle && await authLifecycle.handle(request, response, path, (username, password) => {
      if (options.authenticate) return options.authenticate(username, password);
      const user = findUser(db, username);
      return user && verifyPassword(password, user.password_hash) ? user : undefined;
    }, (account) => {
      const actual = authLifecycle.options.wrongUser ?? account;
      const token = randomBytes(32).toString('hex');
      const expiresAt = Math.min(account.expiresAt ?? Infinity, authLifecycle.now() + authLifecycle.ttlMs);
      sessions.set(token, { userId: actual.id, username: actual.username, role: actual.role, expiresAt,
        ...(authLifecycle.options.wrongUser ? { displayName: account.username } : {}) });
      response.setHeader('set-cookie', [`${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/`, 'auth_challenge=; HttpOnly; SameSite=Strict; Path=/auth; Max-Age=0']);
      redirect(response, '/expenses');
    }, () => {
      const session = currentSession(request);
      return session ? { id: session.userId, username: session.username, role: session.role, expiresAt: session.expiresAt } : undefined;
    })) return;
    if (variant === 'hostile' && request.method === 'GET' && hostileRoute(url, response)) return;
    if (request.method === 'GET' && path === '/login') {
      sendHtml(response, 200, loginPage());
      return;
    }
    if (request.method === 'POST' && path === '/login') {
      const form = await readForm(request);
      const username = form.get('username') ?? ''; const password = form.get('password') ?? '';
      const stored = options.authenticate ? undefined : findUser(db, username);
      const user = options.authenticate ? options.authenticate(username, password)
        : stored && verifyPassword(password, stored.password_hash) ? stored : undefined;
      if (!user) {
        sendHtml(response, 401, loginPage(true));
        return;
      }
      const token = randomBytes(32).toString('hex');
      sessions.set(token, { userId: user.id, username: user.username, role: user.role, ...('expiresAt' in user ? { expiresAt: user.expiresAt } : {}) });
      response.setHeader('set-cookie', `${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/`);
      redirect(response, '/expenses');
      return;
    }
    if (request.method === 'POST' && path === '/logout') {
      const token = cookieValue(request);
      if (token) sessions.delete(token);
      response.setHeader('set-cookie', `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
      redirect(response, '/login');
      return;
    }
    if (request.method === 'GET' && path === '/expenses') {
      const flash = url.searchParams.get('flash') === 'saved'
        ? 'Expense saved'
        : url.searchParams.get('flash') === 'updated' ? 'Expense updated' : '';
      renderList(request, response, url, flash);
      return;
    }
    if (request.method === 'GET' && path === '/expenses/new') {
      if (!requireEditor(request, response)) return;
      sendHtml(response, 200, expenseForm(undefined, variant, idempotency ? (url.searchParams.get('idempotency') ?? randomBytes(24).toString('hex')) : ''));
      return;
    }
    if (request.method === 'POST' && path === '/expenses') {
      const session = requireEditor(request, response);
      if (!session) return;
      const form = await readForm(request);
      const title = (form.get('title') ?? '').trim();
      const category = form.get('category') ?? '';
      const amount = parseAmount(form.get('amount') ?? '');
      if (!title || !categories.includes(category) || amount === undefined) {
        sendHtml(response, 400, expenseForm(undefined, variant));
        return;
      }
      const token = form.get('idempotency_token') ?? '';
      const payload = JSON.stringify([title, category, amount]);
      if (idempotency) {
        if (!token || token.length > 256) { sendHtml(response, 400, page('Invalid token', 'Idempotency token required')); return; }
        const prior = db.prepare('SELECT user_id, payload FROM idempotency_keys WHERE token = ?').get(token) as { user_id: number; payload: string } | undefined;
        if (prior) {
          if (prior.user_id !== session.userId || prior.payload !== payload) { sendHtml(response, 409, page('Conflict', 'Token payload mismatch')); return; }
          redirect(response, '/expenses?flash=saved'); return;
        }
      }
      if (idempotency) db.exec('BEGIN IMMEDIATE');
      try {
        if (defect !== 'missing_persistence') {
          const insert = db.prepare('INSERT INTO expenses (title, category, amount_cents, created_by, updated_at) VALUES (?, ?, ?, ?, ?)');
          const writeCount = defect === 'duplicate_write' ? 2 : 1;
          for (let index = 0; index < writeCount; index += 1) insert.run(title, category, amount, session.userId, new Date().toISOString());
          if (idempotency) db.prepare('INSERT INTO idempotency_keys VALUES (?, ?, ?)').run(token, session.userId, payload);
        }
        if (idempotency) db.exec('COMMIT');
      } catch (error) { if (idempotency) db.exec('ROLLBACK'); throw error; }
      isolation?.created(title, (jobTitle) => {
        db.prepare('INSERT INTO expenses (title, category, amount_cents, created_by, updated_at) VALUES (?, ?, ?, ?, ?)')
          .run(jobTitle, category, amount, session.userId, new Date().toISOString());
      });
      if (options.afterCreateCommit) await options.afterCreateCommit();
      redirect(response, '/expenses?flash=saved');
      return;
    }
    const editMatch = path.match(/^\/expenses\/(\d+)\/edit$/);
    if (request.method === 'GET' && editMatch) {
      if (!requireEditor(request, response, true)) return;
      const expense = findExpense(db, Number(editMatch[1]));
      if (!expense) {
        sendHtml(response, 404, page('Not found', '<p>Expense not found</p>'));
        return;
      }
      sendHtml(response, 200, expenseForm(expense, variant));
      return;
    }
    const updateMatch = path.match(/^\/expenses\/(\d+)$/);
    if (request.method === 'POST' && updateMatch) {
      const session = requireEditor(request, response, true);
      if (!session) return;
      const id = Number(updateMatch[1]);
      const existing = findExpense(db, id);
      if (!existing) {
        sendHtml(response, 404, page('Not found', '<p>Expense not found</p>'));
        return;
      }
      const form = await readForm(request);
      const title = (form.get('title') ?? '').trim();
      const category = form.get('category') ?? '';
      const amount = parseAmount(form.get('amount') ?? '');
      if (!title || !categories.includes(category) || amount === undefined) {
        sendHtml(response, 400, expenseForm(existing, variant));
        return;
      }
      if (defect !== 'misleading_success') {
        db.prepare('UPDATE expenses SET title = ?, category = ?, amount_cents = ?, updated_at = ? WHERE id = ?')
          .run(title, category, amount, new Date().toISOString(), id);
      }
      redirect(response, `/expenses?flash=updated`);
      return;
    }
    const deleteMatch = path.match(/^\/expenses\/(\d+)\/delete$/);
    if (request.method === 'POST' && deleteMatch) {
      if (!requireEditor(request, response)) return;
      db.prepare('DELETE FROM expenses WHERE id = ?').run(Number(deleteMatch[1]));
      redirect(response, '/expenses');
      return;
    }
    if (request.method === 'GET' && path.startsWith('/expenses/')) {
      if (!currentSession(request)) redirect(response, '/login');
      else sendHtml(response, 404, page('Not found', '<p>Not found</p>'));
      return;
    }
    sendHtml(response, 404, page('Not found', '<p>Not found</p>'));
  }

  const server = createHttpServer((request, response) => {
    void handle(request, response).catch(() => {
      if (!response.headersSent) sendHtml(response, 500, page('Server error', '<p>Something went wrong</p>'));
      else response.destroy();
    });
  });
  server.on('close', () => { authLifecycle?.clear(); isolation?.reset(); db.close(); });
  return server;
}

export { createDatabase, seed, resetDatabase } from './db.js';

// Compare real paths so a launch through a workspace symlink still counts as the entry point.
function isEntryPoint(): boolean {
  if (!process.argv[1]) return false;
  try { return realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
}

if (isEntryPoint()) {
  const port = Number(process.env.PORT ?? 3000);
  const dbPath = process.env.DB_PATH;
  if (!dbPath) throw new Error('DB_PATH is required');
  const server = createServer({ dbPath, defect: (process.env.DEFECT ?? '') as Defect, variant: (process.env.VARIANT ?? '') as Variant });
  server.listen(port, () => {
    const address = server.address();
    if (address && typeof address !== 'string') process.stdout.write(`LISTENING ${address.port}\n`);
  });
}
