# Apps we run or maintain

Licences were checked on 4 Nov 2026 from each project's own LICENSE file (via the GitHub API, or by reading the file
when the API said NOASSERTION). **Recheck at every pin bump.** The B0 apps are pinned (expense-app, swag-labs, the-internet); pick the
others' pins in B1 and record them in each `apps/<app>/upstream.json`.

**What each "use" means:**
- **Adopt:** vendor the code here, modify it and redistribute it.
- **Mutate:** run a pinned upstream and publish only our patches and toggles.
- **Run only:** fetch at setup by pinned digest. Never redistribute, never commit.

## Summary

| App | Kind | Licence | Use | Phase | Tracks |
|---|---|---|---|---|---|
| Expense app (ours) | Signed-in, 2 roles | MIT (ours) | Adopt: in `apps/expense-app` | B0 | 7.1, 7.3, 7.5, 7.8 |
| Survey site (ours) | Public site, templates | MIT (ours) | Adopt: in `apps/survey-site` | B1 | 7.4 |
| Swag Labs (`saucelabs/sample-app-web`) | Small shop with faulty users | MIT | Adopt | B0 | 7.1, 7.3 |
| the-internet (`saucelabs/the-internet`, formerly `tourdedave/the-internet`) | Tricky UI patterns | Apache-2.0 | Run only | B0 | 7.4 |
| UI Test Automation Playground (`Inflectra/ui-test-automation-playground`) | Timing, dynamic IDs, shadow DOM | Apache-2.0 | Run only | B1 | 7.4 |
| RealWorld "Conduit" (`gothinkster/realworld`) | Medium-style social and content app | MIT (spec); check each chosen implementation | Mutate | B1 | 7.1, 7.5, 7.8 |
| ParaBank (`parasoft/parabank`) | Online bank | Apache-2.0 | Mutate | B1 | 7.1 |
| Ghost (`TryGhost/Ghost`) | CMS, members, newsletters | MIT | Mutate | B1 | 7.3, 7.6 |
| Mailpit (`axllent/mailpit`) | Test inbox with API | MIT | Run only | B1 | 7.6 (infrastructure) |
| Keycloak (`keycloak/keycloak`) | Identity provider: SSO, roles, one-time codes | Apache-2.0 | Run only | B1 | 7.6 (infrastructure) |
| WebTestBench apps (`friedrichor/WebTestBench`) | AI-built apps with natural defects | Apache-2.0 (code and dataset) | Adopt | B1 | 7.2 |
| ACT rules test cases (`act-rules/act-rules.github.io`) | Accessibility pass and fail cases | W3C Software and Document License | Adopt | B1 | 7.5 |
| Saleor dashboard (`saleor/saleor-dashboard`) + Saleor (`saleor/saleor`) | Commerce admin and back end | BSD-3-Clause | Mutate (dashboard) | B1 | 7.3 |
| OWASP Juice Shop (`juice-shop/juice-shop`) | Deliberately insecure shop | MIT | Mutate | B3 | 7.7 |
| Medusa (`medusajs/medusa`) | Headless commerce and admin | MIT, except Enterprise Edition files | Mutate (non-EE only) | B3 | 7.7 |
| Cal.com (`calcom/cal.com`) | Booking, timezones, emails | MIT (root; check for `ee/`) | Mutate (non-EE only) | B3 | 7.6, 7.7 |
| Excalidraw (`excalidraw/excalidraw`) | Canvas-heavy app | MIT | Run only | B1 | 7.4 |
| WebArena (`web-arena-x/webarena`) | Self-hosted shop, admin, forum, GitLab, map | Code Apache-2.0; images bundle Magento (OSL-3.0), GitLab, OpenStreetMap and scraped content | Run only | B3 | 7.8 |
| VisualWebArena (`web-arena-x/visualwebarena`) | Visual classifieds, shop and forum tasks | Code MIT; same content caveat | Run only | B3 | 7.8 |
| Hoppscotch (`hoppscotch/hoppscotch`) | Developer tool, heavy client state | MIT | Optional | later | — |
| fragmatic.ai, opensenselabs.com | Real sites | Not ours to copy | Read-only, live | B0 | 7.4 only |

**Don't mutate:**
- **restful-booker-platform:** GPL-3.0. Our published mutations would have to carry the GPL.
- **Twenty:** AGPL-3.0 plus commercial files.
- **Saleor storefront:** FSL-1.1, which isn't open source until it converts to Apache.

We may run these unmodified if one becomes useful (BD7).

## Per app

### Expense app (ours)
- **Source:** `apps/expense-app/app` (TypeScript and SQLite, no runtime dependencies).
- **Why:** a signed-in app with two roles (viewer and editor), eight seeded expenses, a deterministic reset and
  trusted read-only evidence queries (`expense.byTitle`, `byId`, `list`, `sum`). It is the core of the regression
  track.
- **Defects already built** (`DEFECT=` env var). Each becomes one label:

  | Toggle (any comma-separated subset) | What goes wrong | Category | Severity | Difficulty | Exclusive group |
  |---|---|---|---|---|---|
  | `permission_bypass` | Viewer can open the edit form and save, though no Edit link is shown | permission | critical | blatant | |
  | `stale_state` | List served from a 60-second cache after a write | consistency | major | blatant | |
  | `ignored_filter` | Category filter ignored | functional | major | blatant | `expense-filter` |
  | `wrong_total` | Total omits the last row | consistency | major | blatant | |
  | `missing_persistence` | Save shows success but nothing is written | functional | critical | blatant | `expense-create` |
  | `duplicate_write` | One save writes two rows | functional | critical | blatant | `expense-create` |
  | `misleading_success` | Edit says "Expense updated" but nothing is saved | functional (copy) | critical | blatant | `expense-update` |
  | `total_under_filter` | Under a category filter the total still sums every row; unfiltered is right | consistency | major | subtle | `expense-filter` |
  | `delete_open_to_viewer` | Viewer has no Delete button, but a direct POST `/expenses/:id/delete` succeeds | permission | critical | subtle | |
  | `edit_drops_cents` | An edit saves the amount truncated to whole units (12.50 → 12.00); adding is right | functional | critical | subtle | `expense-update` |
  | `long_title_truncated` | Titles over 20 characters are silently cut to 20 on add and edit | functional | major | subtle | |
  | `title_not_escaped` | The list renders titles as HTML (`<b>x</b>` is bold; stored XSS) | security-hygiene | major | subtle | |
  | `edit_resets_category` | The edit form preselects no category, so an untouched save changes it to the first option | functional | major | subtle | `expense-update` |

  All are deterministic, exposure `novel`. A group holds defects where one hides another: `missing_persistence` skips
  the insert (hides `duplicate_write`), `misleading_success` skips the update (hides both edit bugs), and
  `ignored_filter` lists every row (hides `total_under_filter`).

- **Deliberate change already built:** `VARIANT=relabel` changes the visible labels. Title becomes "Expense title",
  Save becomes "Save expense" and "Add expense" becomes "New expense". Behaviour stays the same.
- **To add:**
  - visual mutations (overlap, clipping, off-token colour);
  - accessibility mutations (focus trap, missing label, reflow);
  - usability mutations (extra step, hidden primary action).
- **Don't bring:**
  - `VARIANT=hostile`: an open redirect plus injection routes, for security-tool tests outside the bench's scope;
  - `fixture-credentials.json`: generate test accounts per episode instead.
- **In the bench** since 5 Nov: `bench-entry.mjs` generates accounts per episode; `verify.ts` checks all 8 labels.

### Expense app HU-G additions (16 Nov 2026)

The expense app now has 30 planted defects and four opt-in traps. Ten new `DEFECT` names cover copy, dead logout,
wrong-row navigation, a mistyped add URL, invalid input acceptance, a visible password and mangled Unicode.
`TRAP=refund_row,braces_title,empty_category,legit_duplicate` adds correct content that resembles bugs. Unknown names
stop startup. No switch changes the clean response bytes when disabled. See the [full switch table, masking notes,
track composition and native checks](../apps/expense-app/README.md#hu-g-defect-kinds-and-traps-16-nov-2026).

Traps use `kind: trap` and count like deliberate changes for false alarms, with separate total/per-label trap
counts. Exploration and regression cover all ten new kinds, with paired traps and clean/twin controls. No upstream
code or text was copied; no dependency was added. Native qualification is pending; offline evidence is in HANDOFF.

### Survey site (ours)
- **Source:** `apps/survey-site/app`.
- **Contents:**
  - a home page, 12 blog articles, contact, search, about and team pages;
  - two landmark variants;
  - volatile banner names;
  - robots-denied private paths;
  - every non-GET request returns 405.
- **Answer key:** `truth.json` labels each page's template.
- **Variants:**
  - `cosmetic`: editorial text changes. This is the deliberate-change control.
  - `structural`: adds a Phone field and a "Request callback" action to the contact page.
- **Not wired into a track yet** (B1, noise track).

### Swag Labs
- **Built-in faulty users:** `problem_user`, `error_user`, `visual_user`, `performance_glitch_user` and
  `locked_out_user`. Each becomes a labelled defect, and `standard_user` is the clean control.
- **Licence:** MIT, so it can be adopted and redistributed. Vendor it at a pinned commit.

### the-internet; UI Test Automation Playground
- **Use:** noise and robustness only. These are pages that are hard but not broken. Any finding raised on them
  counts as a false alarm, unless the page is one of the few labelled "intentionally broken" demo pages. Label
  those explicitly.

### RealWorld "Conduit"
- **Coverage:** sign-up, articles, comments, follows, tags and favourites.
- **Implementations:** pick one front end and one back end with permissive licences, and check each repo's
  licence.
- **Plant:**
  - permission leaks (editing another user's article);
  - count mismatches (the favourites count);
  - pagination bugs;
  - accessibility faults;
  - usability faults.

### ParaBank
- **Coverage:** transfers, bill pay, loans and balances.
- **Plant:** calculation and consistency bugs, such as a balance that doesn't match its transactions, or rounding
  errors. This feeds invariant mining (RQ6).

### Ghost
- **Coverage:** members sign-up, magic-link sign-in, newsletters and paid tiers. Mail goes through Mailpit.
- **Plant:**
  - email faults (wrong host in the link, expired token);
  - theme visual faults.
- **Deliberate changes:** content edits.

### Mailpit; Keycloak
- **Use:** infrastructure, run only.
- **Mailpit:** one per episode.
- **Keycloak:**
  - one realm per episode;
  - roles mapped to app roles;
  - one-time-code second factor for the code-based sign-in cases.

### WebTestBench
- **Source:** import the apps and their natural-defect labels, keeping their Apache-2.0 NOTICE and marking every
  change we make.
- **Comparison:** their headline is that every model scored < 30% F1. RQ10 compares against it.

### ACT rules
- **Source:** adopt the passing and failing test cases as rule-level accessibility ground truth.
- **Licence:** keep the W3C notice and mark our changes.

### Saleor dashboard
- **Coverage:** an admin with dense tables and forms.
- **Plant:**
  - visual faults (tables, overflow);
  - copy faults (raw keys).
- **Deliberate changes:** a redesigned table.

### Juice Shop
- **Use:** its documented vulnerabilities are the exploration answer key for access control and security hygiene.
- **Scoring:** only QA-relevant categories count (broken access, exposed data, missing headers). Exploit challenges
  are out of scope.

### Medusa admin; Cal.com
- **Medusa admin:** exploration on commerce admin. Use non-EE code only.
- **Cal.com:**
  - exploration on booking;
  - timezones, availability, double booking;
  - confirmation emails through Mailpit;
  - non-EE code only.

### WebArena; VisualWebArena
- **Use:** run only, for goal-only usability agents (RQ9).
- **Licence caveat:** never redistribute their images or content. Pull them from upstream at setup.

### fragmatic.ai; opensenselabs.com
- **Use:** the only live sites, used only for the noise track.
- **fragmatic.ai:** read-only. The bench never uses the tagged test contact form.
- **opensenselabs.com:**
  - GET only, no forms;
  - robots.txt honoured;
  - at least 1 second between page loads.
