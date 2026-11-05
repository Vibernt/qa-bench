# Expense app

Ours (MIT). A signed-in app with two roles (viewer, editor), eight seeded expenses, a deterministic reset and trusted
read-only evidence queries. The code is in `app/`: `npm install && npm run build && npm test` (Node 26+, no runtime
dependencies; SQLite via `node:sqlite`). Run it with `node app/dist/server.js`; `DEFECT=` and `VARIANT=` select a
planted defect or a variant.

Planted defects (`DEFECT=`), one label each: `permission_bypass`, `stale_state`, `ignored_filter`, `wrong_total`,
`missing_persistence`, `duplicate_write`, `misleading_success` (see `docs/APPS.md`).
Deliberate change: `VARIANT=relabel`. `VARIANT=hostile` (open redirect and injection routes) is not part of any
track. `app/fixture-credentials.json` holds the seed's test logins only.

For the bench, `bench-entry.mjs` seeds a fresh database at every container start and swaps the seed logins for each
episode's generated accounts; `verify.ts` checks every label against the running app (`npx tsx apps/expense-app/verify.ts`).
