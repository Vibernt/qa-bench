# Expense app

Ours (MIT). A signed-in app with two roles (viewer, editor), eight seeded expenses, a deterministic reset and trusted
read-only evidence queries. The code is in `app/`: `npm install && npm run build && npm test` (Node 26+, no runtime
dependencies; SQLite via `node:sqlite`). Run it with `node app/dist/server.js`; `DEFECT=` and `VARIANT=` select a
planted defect or a variant.

Planted defects (`DEFECT=`), one label each: `permission_bypass`, `stale_state`, `ignored_filter`, `wrong_total`,
`missing_persistence`, `duplicate_write`, `misleading_success` (see `docs/APPS.md`).
Deliberate change: `VARIANT=relabel`. `VARIANT=hostile` (open redirect and injection routes) is not part of any
track. `app/fixture-credentials.json` holds the seed's test logins only.

Copied from the Touchstone fixture on 5 Nov 2026. Three tests that needed Touchstone's credential broker or a browser
were left out (`idempotency`, `variant`, `sign-in`); 7 test files, 34 tests pass standalone.
