# QA Bench report: claude-haiku-5.5-low claude-haiku-5-5@low (bench 0.2.0-dev)

- Run: `v3-claude-haiku-5.5-low`
- Generated: 2026-11-06T07:26:09.607Z
- Tracks: visual
- Seeds: visual=20261106
- Upstreams: expense-app, swag-labs
- Matcher: deterministic-3

## Headline

| Metric | Value |
|---|---|
| Recall | 70.6% (12/17 defects) |
| Recall (novel defects) | 66.7% (10/15 novel defects) |
| Recall (known, publicly documented) | 100.0% (2/2 known defects) |
| Recall (subtle) | 66.7% (6/9 subtle defects) |
| Recall (blatant) | 75.0% (6/8 blatant defects) |
| Recall (visual) | 58.3% (7/12 visual defects) |
| Recall (accessibility) | 100.0% (5/5 accessibility defects) |
| Severity-weighted recall | 73.2% (30/41 weight; critical 5, major 3, minor 1) |
| Natural defects found | 7.5% (12/160 verified real bugs nobody planted) |
| Precision | 100.0% |
| F1 | 82.8% |
| Severity-weighted F1 | 84.5% |
| False alarms per 100 episodes | 0.0 |
| Unmatched findings per episode | 0.00 |
| Mean time to first detection | — |
| Cost | $0.01 (per defect found: $0.00) |
| Human hours | — |
| Wall time | 895.0 s |
| Activity per episode | 14.6 tool calls, 5.5 screenshots taken, 2.8 looked at (12 episodes reported) |
| Severity agreement | 58.3% of 24 true positives that stated a severity |
| Episodes scored | 12/12 |

## By track

| Track | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| visual | 12 | 12/17 | 70.6% | 100.0% | 82.8% | 0/5 | 0.0 | 0.00 |

## By category and class

| Track | Category | Class | Defects found | Recall | Precision | Unmatched |
|---|---|---|---|---|---|---|
| visual | a11y | deterministic | 5/5 | 100.0% | 100.0% | 0 |
| visual | copy | deterministic | 0/0 | — | 100.0% | 0 |
| visual | error-handling | deterministic | 0/0 | — | 100.0% | 0 |
| visual | functional | deterministic | 0/0 | — | — | 0 |
| visual | security-hygiene | deterministic | 0/0 | — | — | 0 |
| visual | usability | deterministic | 0/0 | — | 100.0% | 0 |
| visual | visual | deterministic | 5/10 | 50.0% | 100.0% | 0 |
| visual | visual | judged | 2/2 | 100.0% | 100.0% | 0 |

Per category

| Category | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| a11y | 12 | 5/5 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| consistency | 12 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |
| copy | 12 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |
| error-handling | 12 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |
| functional | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| security-hygiene | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| usability | 12 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |
| visual | 12 | 7/12 | 58.3% | 100.0% | 73.7% | 0/5 | 0.0 | 0.00 |

Per class

| Class | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| deterministic | 12 | 10/15 | 66.7% | 100.0% | 80.0% | 0/0 | 0.0 | 0.00 |
| judged | 12 | 2/2 | 100.0% | 100.0% | 100.0% | 0/5 | 0.0 | 0.00 |

## Episodes

| Episode | Track | App | Status | Defects found | Findings | TP | Dup | Change FA | Excused | Unmatched | First detection | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| visual-001 | visual | expense-app | scored | 2/3 | 2 | 2 | 0 | 0 | 0 | 0 | — | 76.5 s |
| visual-002 | visual | expense-app | scored | 2/2 | 4 | 3 | 1 | 0 | 0 | 0 | — | 57.1 s |
| visual-003 | visual | expense-app | scored | 1/2 | 2 | 2 | 0 | 0 | 0 | 0 | — | 64.1 s |
| visual-004 | visual | swag-labs | scored | 1/1 | 3 | 1 | 2 | 0 | 0 | 0 | — | 69.1 s |
| visual-005 | visual | expense-app | scored | 1/2 | 2 | 2 | 0 | 0 | 0 | 0 | — | 117.8 s |
| visual-006 | visual | swag-labs | scored | 1/1 | 7 | 2 | 5 | 0 | 0 | 0 | — | 48.1 s |
| visual-007 | visual | expense-app | scored | 0/0 | 2 | 2 | 0 | 0 | 0 | 0 | — | 70.9 s |
| visual-008 | visual | expense-app | scored | 1/2 | 2 | 2 | 0 | 0 | 0 | 0 | — | 64.1 s |
| visual-009 | visual | expense-app | scored | 1/2 | 3 | 2 | 1 | 0 | 0 | 0 | — | 78.7 s |
| visual-010 | visual | expense-app | scored | 2/2 | 3 | 3 | 0 | 0 | 0 | 0 | — | 43.2 s |
| visual-011 | visual | swag-labs | scored | 0/0 | 1 | 1 | 0 | 0 | 0 | 0 | — | 48.3 s |
| visual-012 | visual | expense-app | scored | 0/0 | 2 | 2 | 0 | 0 | 0 | 0 | — | 157.1 s |

## Findings

<details><summary>visual-001: 2 finding(s), status scored</summary>

Missed defects: `expense.long-title-overflows`

- `f1` **true_positive** → `expense.login-error-invisible` [a11y]: first finding to hit defect expense.login-error-invisible: matches expense.login-error-invisible[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.low-contrast-text` [a11y]: first finding to hit defect expense.low-contrast-text: matches expense.low-contrast-text[0]: route, role, category; finding has no locator

</details>

<details><summary>visual-002: 4 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.total-covers-last-row` [visual]: first finding to hit defect expense.total-covers-last-row: matches expense.total-covers-last-row[0]: route, role, category; locators not comparable
- `f2` **duplicate** → `expense.total-covers-last-row` [visual]: defect expense.total-covers-last-row already found by f1: matches expense.total-covers-last-row[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.focus-ring-removed` [a11y]: first finding to hit defect expense.focus-ring-removed: matches expense.focus-ring-removed[0]: route, role, category; locators not comparable
- `f4` **true_positive** → `expense.phone-rows-unlabelled` [a11y]: first finding to hit defect expense.phone-rows-unlabelled: matches expense.phone-rows-unlabelled[0]: route, role, category; locators not comparable

</details>

<details><summary>visual-003: 2 finding(s), status scored</summary>

Missed defects: `expense.amounts-misaligned`

- `f1` **true_positive** → `expense.phone-layout-overflow` [visual]: first finding to hit defect expense.phone-layout-overflow: matches expense.phone-layout-overflow[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.row-actions-unnamed` [a11y]: first finding to hit defect expense.row-actions-unnamed: matches expense.row-actions-unnamed[0]: route, role, category; locators not comparable

</details>

<details><summary>visual-004: 3 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.visual-user` [visual]: first finding to hit defect swag.visual-user: matches swag.visual-user[9]: route, role, category; locators not comparable
- `f2` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[0]: route, role, category and selector
- `f3` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[3]: route, role, category and selector

</details>

<details><summary>visual-005: 2 finding(s), status scored</summary>

Missed defects: `expense.login-error-invisible`

- `f1` **true_positive** → `expense.focus-ring-removed` [a11y]: first finding to hit defect expense.focus-ring-removed: matches expense.focus-ring-removed[0]: route, role, category; finding has no locator
- `f2` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; finding has no locator

</details>

<details><summary>visual-006: 7 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.visual-user` [consistency]: first finding to hit defect swag.visual-user: matches swag.visual-user[5]: route, role, category and selector
- `f2` **duplicate** → `swag.visual-user` [consistency]: defect swag.visual-user already found by f1: matches swag.visual-user[10]: route, role, category; locators not comparable
- `f3` **duplicate** → `swag.visual-user` [copy]: defect swag.visual-user already found by f1: matches swag.visual-user[11]: route, role, category; locators not comparable
- `f4` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[3]: route, role, category and selector
- `f5` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[4]: route, role, category and selector
- `f6` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[0]: route, role, category and selector
- `f7` **true_positive** → `swag.cart-count-grammar` [a11y]: first finding to hit defect swag.cart-count-grammar: matches swag.cart-count-grammar[0]: route, role, category and selector

</details>

<details><summary>visual-007: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.row-actions-unnamed` [a11y]: first finding to hit defect expense.row-actions-unnamed: matches expense.row-actions-unnamed[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.no-thousands-separator` [copy]: first finding to hit defect expense.no-thousands-separator: matches expense.no-thousands-separator[0]: route, role, category; locators not comparable

</details>

<details><summary>visual-008: 2 finding(s), status scored</summary>

Missed defects: `expense.long-title-overflows`

- `f1` **true_positive** → `expense.low-contrast-text` [a11y]: first finding to hit defect expense.low-contrast-text: matches expense.low-contrast-text[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.row-actions-unnamed` [a11y]: first finding to hit defect expense.row-actions-unnamed: matches expense.row-actions-unnamed[0]: route, role, category; locators not comparable

</details>

<details><summary>visual-009: 3 finding(s), status scored</summary>

Missed defects: `expense.amounts-misaligned`

- `f1` **true_positive** → `expense.phone-layout-overflow` [visual]: first finding to hit defect expense.phone-layout-overflow: matches expense.phone-layout-overflow[0]: route, role, category; locators not comparable
- `f2` **duplicate** → `expense.phone-layout-overflow` [visual]: defect expense.phone-layout-overflow already found by f1: matches expense.phone-layout-overflow[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.row-actions-unnamed` [a11y]: first finding to hit defect expense.row-actions-unnamed: matches expense.row-actions-unnamed[0]: route, role, category; locators not comparable

</details>

<details><summary>visual-010: 3 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.total-covers-last-row` [visual]: first finding to hit defect expense.total-covers-last-row: matches expense.total-covers-last-row[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.focus-ring-removed` [a11y]: first finding to hit defect expense.focus-ring-removed: matches expense.focus-ring-removed[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.viewer-empty-actions-column` [usability]: first finding to hit defect expense.viewer-empty-actions-column: matches expense.viewer-empty-actions-column[0]: route, role, category; finding has no locator

</details>

<details><summary>visual-011: 1 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.focus-indicator-missing` [a11y]: first finding to hit defect swag.focus-indicator-missing: matches swag.focus-indicator-missing[0]: route, role, category; locators not comparable

</details>

<details><summary>visual-012: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.phone-rows-unlabelled` [a11y]: first finding to hit defect expense.phone-rows-unlabelled: matches expense.phone-rows-unlabelled[0]: route, role, category; locators not comparable

</details>
