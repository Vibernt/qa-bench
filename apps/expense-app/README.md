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
- Visual and accessibility (track 7.3). These are CSS only: the page's text and behaviour don't change, so they show
  only on the rendered page. Severity follows impact.

  | `DEFECT` | Label | Category | Severity | Difficulty |
  |---|---|---|---|---|
  | `layout_phone_overflow` | `expense.phone-layout-overflow` | visual | critical | subtle: phones only |
  | `total_covers_last_row` | `expense.total-covers-last-row` | visual | major | blatant |
  | `alert_text_invisible` | `expense.login-error-invisible` | visual | major | subtle: a failed sign-in only |
  | `long_title_overflows` | `expense.long-title-overflows` | visual | major | subtle: long titles only |
  | `muted_text_low_contrast` | `expense.low-contrast-text` | a11y | minor | blatant |
  | `focus_ring_removed` | `expense.focus-ring-removed` | a11y | minor | subtle: keyboard only |
  | `amounts_misaligned` | `expense.amounts-misaligned` | visual | minor | blatant |

Exclusive groups (`switch.exclusive`) hold defects where one hides another, so they never share an episode:
- `expense-create`: `missing_persistence` skips the insert, hiding `duplicate_write`.
- `expense-update`: `misleading_success` skips the update, hiding `edit_drops_cents` and `edit_resets_category`.
- `expense-filter`: `ignored_filter` lists every row, hiding `total_under_filter`.
- `expense-title`: `long_title_truncated` cuts titles to 20 characters, which never overflow
  (`long_title_overflows`).

 A label takes one group, so the two edit bugs also
exclude each other although they don't mask. Other overlaps are partial and stay allowed: `stale_state` delays the
list for 60 s after any write (the edit form, and a filter's first load, show the saved data), and with both `missing_persistence`
and `misleading_success` on, the title defects can't be shown, since the seed titles hold no long text or markup.

Several labels share a route and category, so every planted `found_by` entry has a `description_pattern`.
`patterns.test.ts` (a unit test) checks them with the scorer's matcher: the B0 agent hits still match, and no B0 or
sample description matches two labels that can be active together.

**Design.** `/theme.css` (`app/src/theme.ts`) styles every page. It is responsive: below 600 px the table becomes
stacked rows, so every action stays on screen on a phone. The visual defects and the restyle add rules to it.

Deliberate changes: `VARIANT=relabel` renames labels, and `VARIANT=restyle` is a visual refresh (teal accent, pill
buttons, tighter rows). `VARIANT=hostile` (open redirect and injection routes) is not part of any
track. `app/fixture-credentials.json` holds the seed's test logins only.

For the bench, `bench-entry.mjs` seeds a fresh database at every container start and swaps the seed logins for each
episode's generated accounts; `verify.ts` checks every label against the running app, plus multi-defect
combinations (`npx tsx apps/expense-app/verify.ts`). The visual probes drive Chromium and measure what a person would
see: element geometry, the element painted at a point, contrast ratios and focus styles.

## HU-G: defect kinds and traps (16 Nov 2026)

Ten additional switches bring the expense app to 30 planted defects. All are opt-in; the clean response-byte
comparison uses a frozen copy of the pre-HU-G server, captured before edits (only its import paths were relocated),
for viewer/editor login, stylesheet, lists, filter, add/edit forms, forbidden/not-found and rejected-save responses.
This differential test captures expected bytes from the original implementation at test time, not handwritten HTML.

| `DEFECT` | Symptom | Category | Difficulty |
|---|---|---|---|
| `template_token` | Signed-in account line reads `{{username}}` | copy | blatant |
| `misspelled_label` | Category reads Catagory in list/filter and both forms | copy | subtle |
| `sign_out_dead` | POST Sign out returns the list and preserves the session | functional | blatant |
| `wrong_row_action` | Later Edit links target the first displayed expense | functional | subtle |
| `add_link_404` | Add expense points at `/expneses/new`; `/expenses/new` works | functional | blatant |
| `negative_amount_accepted` | Add/edit accept negative decimal amounts; totals decrease | error-handling | subtle |
| `password_visible` | Login password input uses `type="text"` | security-hygiene | blatant |
| `raw_error` | Invalid/overlong/unsafe amounts return 500 with synthetic internal trace text before save | error-handling | subtle |
| `blank_title_accepted` | Whitespace-only titles save as empty strings | error-handling | subtle |
| `non_ascii_mangled` | Accented letters and emoji become `?` on add/edit; ASCII survives | functional | subtle |

`TRAP=` uses the same comma/whitespace/deduplication rules and unknown-name refusal as `DEFECT=`. It is passed
through compose and both app entry points. Unset traps perform no seed writes and add no filter options.

| `TRAP` | Correct seeded content / option | Label |
|---|---|---|
| `refund_row` | Refund: conference ticket, -$25.00 (rendered `$-25.00`), included in total | `expense.refund-row` |
| `braces_title` | Literal user title `Lunch {team offsite}` | `expense.braces-title` |
| `empty_category` | Training filter option with no expenses and `$0.00` total | `expense.empty-category` |
| `legit_duplicate` | Weekly bus pass, $12.00, distinct ids 103 and 104 | `expense.legit-duplicate` |

Labels in `traps/<kebab-name>/label.yaml` use `kind: trap`. Reporting a trap is `false_alarm_change` and contributes
to the existing change false-alarm counters and precision denominator. It never adds to recall. JSON metrics also
carry `trap_false_alarms` (finding count) and `trap_false_alarms_by_label` (including zero for active unreported traps);
Markdown includes a per-trap table. Counts include repeated reports, like change false alarms; flagged-label rates
still count a label once. Matcher `deterministic-4` checks narrowly identified traps before planted defects, because
the existing duplicate-write pattern deliberately recognises generic duplicate reports. Trap patterns require the
seeded identity/context; paired actual defect reports are tested as true positives in the same episode.

Every new label has three positive and three near-miss matcher examples in `kinds-pattern-cases.json`; paired tests
also cover refund versus wrong-total. Existing patterns were preserved. The native route probes are shared by
`verification/kinds.ts`, the app's tests and `verify.ts`. Four 3-way mixes cover an old defect, a new defect and a trap.

The existing exclusive groups remain. Write-blocking defects (`missing_persistence`, `misleading_success`) still
mask write-dependent symptoms on those paths; stale-state delays list observations, as before. `raw_error` prevents
the unsafe-amount write that exposes the natural huge-amount/list failure. Its new defect label declares that
relation with `masks`, preserving old natural-label bytes. `blank_title_accepted` likewise declares the mask for
the whitespace rejection probe for rejected-form-loses-input; other invalid
inputs still lose their fields. No natural description patterns were changed. The zero-amount native probe retains its negative-request check: it expects rejection normally and acceptance
only when the new negative-amount switch is on. The negative defect also has its own clean/on probe.

Both exploration and regression include all ten new defects and all four traps. Neither track schema has a
category allowlist, so copy and security-hygiene fit both: exploration discovers them freely; regression exercises
sign-in, list and form journeys. Existing seeds and index-to-id/account-seed derivation are unchanged. Random
composition changes because labels covered by explicit recipes are reserved for those recipes. Exploration grows
17 -> 29 episodes; regression 24 -> 36. Each appends ten mixed recipes and two clean-with-traps controls. Mixed
recipes retain the one-blatant cap and have two defects. Other mixed expense episodes rotate traps; expense clean
and twin episodes carry all four. `episodes.count` includes recipes; `clean_episodes` counts random-plan controls,
so each track now has four clean episodes overall. Explicit recipes are public-split only.

`harness/agents/sets/v0.4-kinds-12.yaml` selects exploration-018 through exploration-029. It covers every new defect
and every trap at least twice, with two clean-with-traps controls. It requires freshly generated exploration
artifacts; old generated episode files are intentionally unchanged. Historic reports/keys are not rescored.

Native verification (Node 26+, Docker and installed Playwright Chromium for `verify.ts`):
```sh
npm run check
npm run build --prefix apps/expense-app/app
npm test --prefix apps/expense-app/app
npx tsx apps/expense-app/verify.ts
```
The last command builds the image; to reuse an operator-built image:
```sh
npx tsx apps/expense-app/verify.ts --image qa-bench-app-expense-app:verify
```
Before running the new agent set, generate the current composition (this replaces local ignored episode artifacts):
```sh
npx tsx bin/qa-bench.ts generate exploration
npx tsx bin/qa-bench.ts generate regression
```
No separate browser test was added: `verify.ts` owns the native HTTP and existing Chromium probes.
