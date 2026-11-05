# Expense app

Ours (MIT). A signed-in app with two roles (viewer, editor), eight seeded expenses, a deterministic reset and trusted
read-only evidence queries. The code is in `app/`: `npm install && npm run build && npm test` (Node 26+, no runtime
dependencies; SQLite via `node:sqlite`). Run it with `node app/dist/server.js`; `DEFECT=` and `VARIANT=` select
planted defects or a variant.

Planted defects, one label each (see `docs/APPS.md`). `DEFECT=` takes one name or a comma-separated list, e.g.
`DEFECT=wrong_total,edit_drops_cents,title_not_escaped`; an unknown name stops the app.
- Blatant: `permission_bypass`, `stale_state`, `ignored_filter`, `wrong_total`, `missing_persistence`,
  `duplicate_write`, `misleading_success`.
- Subtle: `total_under_filter`, `delete_open_to_viewer`, `edit_drops_cents`, `long_title_truncated`,
  `title_not_escaped`, `edit_resets_category`.

Exclusive groups (`switch.exclusive`) hold defects where one hides another, so they never share an episode:
`expense-create` (`missing_persistence` skips the insert, hiding `duplicate_write`), `expense-update`
(`misleading_success` skips the update, hiding `edit_drops_cents` and `edit_resets_category`) and `expense-filter`
(`ignored_filter` lists every row, hiding `total_under_filter`). A label takes one group, so the two edit bugs also
exclude each other although they don't mask. Other overlaps are partial and stay allowed: `stale_state` delays the
list for 60 s after any write (the edit form, and a filter's first load, show the saved data), and with both `missing_persistence`
and `misleading_success` on, the title defects can't be shown, since the seed titles hold no long text or markup.

Several labels share a route and category, so every planted `found_by` entry has a `description_pattern`.
`patterns.test.ts` (a unit test) checks them with the scorer's matcher: the B0 agent hits still match, and no B0 or
sample description matches two labels that can be active together.

Deliberate change: `VARIANT=relabel`. `VARIANT=hostile` (open redirect and injection routes) is not part of any
track. `app/fixture-credentials.json` holds the seed's test logins only.

For the bench, `bench-entry.mjs` seeds a fresh database at every container start and swaps the seed logins for each
episode's generated accounts; `verify.ts` checks every label against the running app, plus multi-defect
combinations (`npx tsx apps/expense-app/verify.ts`).
