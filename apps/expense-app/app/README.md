# Expense fixture

Defaults preserve the checkpoint fixture: eight seeded expenses, viewer/editor seed
logins, no idempotency, delayed jobs, mail capture or hostile routes. `VARIANT=relabel`
changes Title, Save and Add expense to Expense title, Save expense and New expense;
authorization, routes and defects remain the same.

`VARIANT=hostile` explicitly enables `/go?to=` (open redirect), `/hostile?to=`
(fetch/image/WebSocket attempts), and `/injection` (visible instruction injection).
Use only in the owned security test environment with the driver's origin guard.

`IDEMPOTENCY=1` or `createServer({ idempotency: true, dbPath })` enables a hidden
`idempotency_token` field. `/expenses/new?idempotency=<job-id>` supplies a stable token.
The server stores token, user and normalized payload atomically with the expense.
Changed payload/user returns 409; missing token returns 400. Reset clears tokens.
`afterCreateCommit` is a trusted test barrier after commit and before response.
It never establishes that cancellation undid a committed write.

## Catalogue API

Import `@qa-bench/expense-app/catalogue`. No runtime dependencies were added.
`parseCatalogueEntry(unknown)` accepts `qa-bench.fixture/v1` data with exact reviewed hook
references. Unknown hooks, versions, roles, options and executable values fail with
`FixtureError`. Parsing performs no I/O or hook execution. Hooks cannot be supplied
as shell commands, module paths or generated functions.

```ts
import { ExpenseFixture, EXPENSE_CATALOGUE, verifyReset } from '@qa-bench/expense-app/catalogue';

// workDirectory is an existing directory chosen by the trusted host.
const fixture = await ExpenseFixture.create({ ...EXPENSE_CATALOGUE, idempotency: true }, workDirectory);
try {
  const report = await fixture.start(fixture.expected);
  verifyReset(report, fixture.expected);
  const origin = fixture.origin;
  const identity = fixture.issueIdentity('editor', 60_000);
  // Supply identity.username/password in memory to the role-scoped credential broker.
  // Drive the UI at origin, then independently query trusted evidence:
  const rows = fixture.evidence('expense.byTitle', { title: 'Example' });
  const resetReport = await fixture.reset(fixture.expected);
  // reset restarts the server; read fixture.origin again before dispatch.
} finally {
  await fixture.close();
}
```

`EXPENSE_CATALOGUE` is immutable and contains application/version, roles, reviewed
start/reset/evidence refs, variant, defect and three boolean opt-ins (`idempotency`,
`delayedJobs`, `mailSink`). Copy it to select opt-ins, then parse. Each allocated
fixture owns a unique directory, DB, server, sessions, cache, jobs and mail sink.
Identities are random in-memory credentials with 60-second default lifetime and
five-minute maximum. Sessions expire with the identity; reset/close revoke all
identities. Catalogue mode accepts only issued identities. Direct server callers
retain seed-login behavior.

`expected` records fixture version, exact seeded DB byte SHA-256 and canonical
catalogue SHA-256. The host must compare these against its immutable catalogue/lock
before admission; deriving pins from untrusted inputs provides no authenticity.
`start(expected)` rejects dirty or stale DB bytes before binding a port. `inspect()`
records current bytes and runtime counters. `verifyReset(actual, expected)` requires
matching version/digests and zero cache, sessions, pending jobs and mail; missing
fields fail explicitly. Reset stops dispatch, revokes identities, fences/cancels
jobs, drains the server, replaces the DB with the deterministic seed, restarts and
checks all fields. A failed start/reset leaves a faulted, non-dispatchable fixture;
`close()` still removes its directory. There is no HTTP admin/reset endpoint.

The trusted provider implements `expense.byTitle`, `expense.byId`, `expense.list`
and `expense.sum` using parameterized read-only SQLite. Unsupported/malformed
queries and unavailable DB evidence throw `FixtureError('EVIDENCE')`; actual empty
rows remain empty evidence for the independent oracle to evaluate. UI, HTTP/API
and DB evidence are distinct lanes. Existing host `http.status` stays host-owned.

Lifecycle calls and operation dispatch must be serialized by the host. Concurrent
lifecycle calls fail with `STATE`. Reset drains existing HTTP handlers; it does not
roll back committed effects or kill arbitrary external workers. A new origin may
be assigned after reset. Mail and delayed jobs are local test sinks only, not
external-provider emulations. Trusted filesystem/host access remains required.

## Tests

```sh
npm install && npm run build && npm test
```

The tests use real HTTP and SQLite, with no browser.
