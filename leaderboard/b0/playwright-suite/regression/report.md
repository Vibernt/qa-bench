# QA Bench report: playwright-suite 0.1.0 (bench 0.1.0-b0)

- Run: `b0-playwright-regression`
- Generated: 2026-11-05T05:12:27.503Z
- Tracks: regression
- Seeds: regression=20261105
- Upstreams: expense-app, swag-labs
- Matcher: deterministic-2

## Headline

| Metric | Value |
|---|---|
| Recall | 100.0% (12/12 defects) |
| Severity-weighted recall | 100.0% (50/50 weight; critical 5, major 3, minor 1) |
| Precision | 78.0% |
| F1 | 87.6% |
| Severity-weighted F1 | 87.6% |
| False alarms per 100 episodes | 41.2 |
| Unmatched findings per episode | 0.00 |
| Mean time to first detection | 2.7 s |
| Cost | $0.00 (per defect found: $0.00) |
| Human hours | — |
| Wall time | 306.3 s |
| Severity agreement | — (no finding stated a severity) |
| Episodes scored | 17/17 |

## By track

| Track | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| regression | 17 | 12/12 | 100.0% | 78.0% | 87.6% | 7/11 | 41.2 | 0.00 |

## By category and class

| Track | Category | Class | Defects found | Recall | Precision | Unmatched |
|---|---|---|---|---|---|---|
| regression | consistency | deterministic | 2/2 | 100.0% | 100.0% | 0 |
| regression | consistency | judged | 0/0 | — | 100.0% | 0 |
| regression | copy | judged | 0/0 | — | 0.0% | 0 |
| regression | error-handling | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| regression | functional | deterministic | 6/6 | 100.0% | 100.0% | 0 |
| regression | perf | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| regression | permission | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| regression | visual | judged | 1/1 | 100.0% | 100.0% | 0 |

Per category

| Category | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| consistency | 17 | 2/2 | 100.0% | 100.0% | 100.0% | 0/1 | 0.0 | 0.00 |
| copy | 17 | 0/0 | — | 8.3% | — | 7/8 | 41.2 | 0.00 |
| error-handling | 17 | 1/1 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| functional | 17 | 6/6 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| perf | 17 | 1/1 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| permission | 17 | 1/1 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| visual | 17 | 1/1 | 100.0% | 100.0% | 100.0% | 0/2 | 0.0 | 0.00 |

Per class

| Class | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| deterministic | 17 | 11/11 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| judged | 17 | 1/1 | 100.0% | 42.1% | 59.3% | 7/11 | 41.2 | 0.00 |

## Episodes

| Episode | Track | App | Status | Defects found | Findings | TP | Dup | Change FA | Excused | Unmatched | First detection | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| regression-001 | regression | expense-app | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 9.0 s |
| regression-002 | regression | swag-labs | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 10.9 s |
| regression-003 | regression | expense-app | scored | 1/1 | 1 | 1 | 0 | 0 | 0 | 0 | 2.9 s | 9.1 s |
| regression-004 | regression | expense-app | scored | 0/0 | 1 | 0 | 0 | 1 | 0 | 0 | — | 9.1 s |
| regression-005 | regression | expense-app | scored | 1/1 | 1 | 1 | 0 | 0 | 0 | 0 | 5.9 s | 8.1 s |
| regression-006 | regression | expense-app | scored | 1/1 | 1 | 1 | 0 | 0 | 0 | 0 | 1.6 s | 8.2 s |
| regression-007 | regression | swag-labs | scored | 1/1 | 12 | 1 | 11 | 0 | 0 | 0 | 1.5 s | 29.0 s |
| regression-008 | regression | expense-app | scored | 1/1 | 1 | 1 | 0 | 0 | 0 | 0 | 4.1 s | 7.4 s |
| regression-009 | regression | swag-labs | scored | 1/1 | 9 | 1 | 7 | 1 | 0 | 0 | 0.6 s | 30.6 s |
| regression-010 | regression | expense-app | scored | 1/1 | 2 | 1 | 0 | 1 | 0 | 0 | 2.9 s | 7.7 s |
| regression-011 | regression | swag-labs | scored | 1/1 | 11 | 1 | 7 | 3 | 0 | 0 | 0.5 s | 30.8 s |
| regression-012 | regression | expense-app | scored | 1/1 | 2 | 1 | 1 | 0 | 0 | 0 | 2.5 s | 8.4 s |
| regression-013 | regression | swag-labs | scored | 1/1 | 1 | 1 | 0 | 0 | 0 | 0 | 5.5 s | 94.9 s |
| regression-014 | regression | expense-app | scored | 1/1 | 3 | 1 | 1 | 1 | 0 | 0 | 3.9 s | 8.2 s |
| regression-015 | regression | swag-labs | scored | 1/1 | 1 | 1 | 0 | 0 | 0 | 0 | 0.6 s | 1.7 s |
| regression-016 | regression | swag-labs | scored | 0/0 | 4 | 0 | 0 | 4 | 0 | 0 | — | 23.0 s |
| regression-017 | regression | swag-labs | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 10.1 s |

## Findings

<details><summary>regression-001: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>regression-002: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>regression-003: 1 finding(s), status scored</summary>

- `pw-001-expense-viewer-endpoints-refused` **true_positive** → `expense.permission-bypass` [permission]: first finding to hit defect expense.permission-bypass: matches expense.permission-bypass[0]: route, role, category; finding has no locator

</details>

<details><summary>regression-004: 1 finding(s), status scored</summary>

- `pw-001-expense-add-control-label` **false_alarm_change** → `expense.relabel` [copy]: flags deliberate change expense.relabel: matches expense.relabel[3]: route, role, category and selector

</details>

<details><summary>regression-005: 1 finding(s), status scored</summary>

- `pw-001-expense-filter-only-chosen` **true_positive** → `expense.ignored-filter` [functional]: first finding to hit defect expense.ignored-filter: matches expense.ignored-filter[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-006: 1 finding(s), status scored</summary>

- `pw-001-expense-total-equals-sum` **true_positive** → `expense.wrong-total` [consistency]: first finding to hit defect expense.wrong-total: matches expense.wrong-total[0]: route, role, category and selector

</details>

<details><summary>regression-007: 12 finding(s), status scored</summary>

- `pw-001-swag-sort` **true_positive** → `swag.error-user` [functional]: first finding to hit defect swag.error-user: matches swag.error-user[8]: route, role, category and selector
- `pw-002-page-console` **duplicate** → `swag.error-user` [error-handling]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[9]: route, role, category; finding has no locator
- `pw-003-page-pageerror` **duplicate** → `swag.error-user` [error-handling]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[9]: route, role, category; finding has no locator
- `pw-004-swag-detail-cart` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[10]: route, role, category; locators not comparable
- `pw-005-swag-detail-description` **duplicate** → `swag.error-user` [consistency]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[10]: route, role, category; locators not comparable
- `pw-006-page-pageerror` **duplicate** → `swag.error-user` [error-handling]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[0]: route, role, category; finding has no locator
- `pw-007-swag-cart-add` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[1]: route, role, category and selector
- `pw-008-swag-cart-remove` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[4]: route, role, category and selector
- `pw-009-page-pageerror` **duplicate** → `swag.error-user` [error-handling]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[11]: route, role, category; finding has no locator
- `pw-010-swag-checkout-fields-kept` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[12]: route, role, category and selector
- `pw-011-page-pageerror` **duplicate** → `swag.error-user` [error-handling]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[13]: route, role, category; finding has no locator
- `pw-012-swag-finish` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[14]: route, role, category and selector

</details>

<details><summary>regression-008: 1 finding(s), status scored</summary>

- `pw-001-expense-edit-message-matches` **true_positive** → `expense.misleading-success` [functional]: first finding to hit defect expense.misleading-success: matches expense.misleading-success[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-009: 9 finding(s), status scored</summary>

- `pw-001-swag-product-images-distinct` **true_positive** → `swag.problem-user` [visual]: first finding to hit defect swag.problem-user: matches swag.problem-user[0]: route, role, category; locators not comparable
- `pw-002-swag-sort` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by pw-001-swag-product-images-distinct: matches swag.problem-user[7]: route, role, category and selector
- `pw-003-swag-detail-matches` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by pw-001-swag-product-images-distinct: matches swag.problem-user[8]: route, role, category; locators not comparable
- `pw-004-swag-cart-add` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by pw-001-swag-product-images-distinct: matches swag.problem-user[1]: route, role, category and selector
- `pw-005-swag-cart-remove` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by pw-001-swag-product-images-distinct: matches swag.problem-user[4]: route, role, category and selector
- `pw-006-swag-page-copy` **false_alarm_change** → `swag.relabel` [copy]: flags deliberate change swag.relabel: matches swag.relabel[4]: route, role, category and selector
- `pw-007-swag-checkout-fields-kept` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by pw-001-swag-product-images-distinct: matches swag.problem-user[12]: route, role, category and selector
- `pw-008-swag-overview-item-total` **duplicate** → `swag.problem-user` [consistency]: defect swag.problem-user already found by pw-001-swag-product-images-distinct: matches swag.problem-user[14]: route, role, category and selector
- `pw-009-swag-finish-empties-cart` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by pw-001-swag-product-images-distinct: matches swag.problem-user[16]: route, role, category and selector

</details>

<details><summary>regression-010: 2 finding(s), status scored</summary>

- `pw-001-expense-add-control-label` **false_alarm_change** → `expense.relabel` [copy]: flags deliberate change expense.relabel: matches expense.relabel[3]: route, role, category and selector
- `pw-002-expense-add-one-row` **true_positive** → `expense.duplicate-write` [functional]: first finding to hit defect expense.duplicate-write: matches expense.duplicate-write[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-011: 11 finding(s), status scored</summary>

- `pw-001-swag-layout-grid` **true_positive** → `swag.visual-user` [visual]: first finding to hit defect swag.visual-user: matches swag.visual-user[2]: route, role, category and selector
- `pw-002-swag-layout-grid` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-layout-grid: matches swag.visual-user[3]: route, role, category and selector
- `pw-003-swag-layout-grid` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-layout-grid: matches swag.visual-user[4]: route, role, category and selector
- `pw-004-swag-layout-container` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-layout-grid: matches swag.visual-user[0]: route, role, category and selector
- `pw-005-swag-layout-rotated` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-layout-grid: matches swag.visual-user[1]: route, role, category and selector
- `pw-006-swag-sort` **duplicate** → `swag.visual-user` [functional]: defect swag.visual-user already found by pw-001-swag-layout-grid: matches swag.visual-user[8]: route, role, category and selector
- `pw-007-swag-detail-price` **duplicate** → `swag.visual-user` [consistency]: defect swag.visual-user already found by pw-001-swag-layout-grid: matches swag.visual-user[5]: route, role, category and selector
- `pw-008-swag-layout-container` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-layout-grid: matches swag.visual-user[6]: route, role, category and selector
- `pw-009-swag-page-copy` **false_alarm_change** → `swag.checkout-copy` [copy]: flags deliberate change swag.checkout-copy: matches swag.checkout-copy[0]: route, role, category and selector
- `pw-010-swag-page-copy` **false_alarm_change** → `swag.checkout-copy` [copy]: flags deliberate change swag.checkout-copy: matches swag.checkout-copy[1]: route, role, category and selector
- `pw-011-swag-page-copy` **false_alarm_change** → `swag.checkout-copy` [copy]: flags deliberate change swag.checkout-copy: matches swag.checkout-copy[2]: route, role, category and selector

</details>

<details><summary>regression-012: 2 finding(s), status scored</summary>

- `pw-001-expense-add-control-label` **true_positive** → `expense.missing-persistence` [copy]: first finding to hit defect expense.missing-persistence: matches expense.missing-persistence[1]: route, role, category; locators not comparable
- `pw-002-expense-add-persists` **duplicate** → `expense.missing-persistence` [functional]: defect expense.missing-persistence already found by pw-001-expense-add-control-label: matches expense.missing-persistence[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-013: 1 finding(s), status scored</summary>

- `pw-001-swag-sign-in-time` **true_positive** → `swag.performance-glitch-user` [perf]: first finding to hit defect swag.performance-glitch-user: matches swag.performance-glitch-user[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-014: 3 finding(s), status scored</summary>

- `pw-001-expense-add-control-label` **false_alarm_change** → `expense.relabel` [copy]: flags deliberate change expense.relabel: matches expense.relabel[3]: route, role, category and selector
- `pw-002-expense-add-shows-now` **true_positive** → `expense.stale-state` [consistency]: first finding to hit defect expense.stale-state: matches expense.stale-state[0]: route, role, category; locators not comparable
- `pw-003-expense-edit-shows-now` **duplicate** → `expense.stale-state` [consistency]: defect expense.stale-state already found by pw-002-expense-add-shows-now: matches expense.stale-state[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-015: 1 finding(s), status scored</summary>

- `pw-001-swag-sign-in` **true_positive** → `swag.locked-out-user` [functional]: first finding to hit defect swag.locked-out-user: matches swag.locked-out-user[0]: route, role, category and selector

</details>

<details><summary>regression-016: 4 finding(s), status scored</summary>

- `pw-001-swag-page-copy` **false_alarm_change** → `swag.relabel` [copy]: flags deliberate change swag.relabel: matches swag.relabel[4]: route, role, category and selector
- `pw-002-swag-page-copy` **false_alarm_change** → `swag.checkout-copy` [copy]: flags deliberate change swag.checkout-copy: matches swag.checkout-copy[0]: route, role, category and selector
- `pw-003-swag-page-copy` **false_alarm_change** → `swag.checkout-copy` [copy]: flags deliberate change swag.checkout-copy: matches swag.checkout-copy[1]: route, role, category and selector
- `pw-004-swag-page-copy` **false_alarm_change** → `swag.checkout-copy` [copy]: flags deliberate change swag.checkout-copy: matches swag.checkout-copy[2]: route, role, category and selector

</details>

<details><summary>regression-017: 0 finding(s), status scored</summary>

_No findings._

</details>
