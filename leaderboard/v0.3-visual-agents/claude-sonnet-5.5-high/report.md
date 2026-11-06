# QA Bench report: claude-sonnet-5.5-high claude-sonnet-5-5@high (bench 0.2.0-dev)

- Run: `v3-claude-sonnet-5.5-high`
- Generated: 2026-11-06T06:54:33.137Z
- Tracks: visual
- Seeds: visual=20261106
- Upstreams: expense-app, swag-labs
- Matcher: deterministic-3

## Headline

| Metric | Value |
|---|---|
| Recall | 100.0% (17/17 defects) |
| Recall (novel defects) | 100.0% (15/15 novel defects) |
| Recall (known, publicly documented) | 100.0% (2/2 known defects) |
| Recall (subtle) | 100.0% (9/9 subtle defects) |
| Recall (blatant) | 100.0% (8/8 blatant defects) |
| Recall (visual) | 100.0% (12/12 visual defects) |
| Recall (accessibility) | 100.0% (5/5 accessibility defects) |
| Severity-weighted recall | 100.0% (41/41 weight; critical 5, major 3, minor 1) |
| Natural defects found | 7.9% (13/165 verified real bugs nobody planted) |
| Precision | 97.4% |
| F1 | 98.7% |
| Severity-weighted F1 | 98.7% |
| False alarms per 100 episodes | 0.0 |
| Unmatched findings per episode | 0.08 |
| Mean time to first detection | — |
| Cost | $0.35 (per defect found: $0.02) |
| Human hours | — |
| Wall time | 1037.4 s |
| Activity per episode | 18.1 tool calls, 4.3 screenshots taken, 7.4 looked at (12 episodes reported) |
| Severity agreement | 66.7% of 30 true positives that stated a severity |
| Episodes scored | 12/12 |

## By track

| Track | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| visual | 12 | 17/17 | 100.0% | 97.4% | 98.7% | 0/5 | 0.0 | 0.08 |

## By category and class

| Track | Category | Class | Defects found | Recall | Precision | Unmatched |
|---|---|---|---|---|---|---|
| visual | a11y | deterministic | 5/5 | 100.0% | 100.0% | 0 |
| visual | copy | deterministic | 0/0 | — | — | 0 |
| visual | error-handling | deterministic | 0/0 | — | 100.0% | 0 |
| visual | functional | deterministic | 0/0 | — | — | 0 |
| visual | security-hygiene | deterministic | 0/0 | — | — | 0 |
| visual | usability | deterministic | 0/0 | — | — | 0 |
| visual | visual | deterministic | 10/10 | 100.0% | 92.3% | 1 |
| visual | visual | judged | 2/2 | 100.0% | 88.9% | 1 |

Per category

| Category | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| a11y | 12 | 5/5 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| consistency | 12 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |
| copy | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| error-handling | 12 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |
| functional | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| security-hygiene | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| usability | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| visual | 12 | 12/12 | 100.0% | 95.2% | 97.6% | 0/5 | 0.0 | 0.08 |

Per class

| Class | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| deterministic | 12 | 15/15 | 100.0% | 96.6% | 98.2% | 0/0 | 0.0 | 0.08 |
| judged | 12 | 2/2 | 100.0% | 90.9% | 95.2% | 0/5 | 0.0 | 0.08 |

## Episodes

| Episode | Track | App | Status | Defects found | Findings | TP | Dup | Change FA | Excused | Unmatched | First detection | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| visual-001 | visual | expense-app | scored | 3/3 | 3 | 3 | 0 | 0 | 0 | 0 | — | 70.4 s |
| visual-002 | visual | expense-app | scored | 2/2 | 2 | 2 | 0 | 0 | 0 | 0 | — | 115.0 s |
| visual-003 | visual | expense-app | scored | 2/2 | 2 | 2 | 0 | 0 | 0 | 0 | — | 56.1 s |
| visual-004 | visual | swag-labs | scored | 1/1 | 6 | 2 | 4 | 0 | 0 | 0 | — | 90.4 s |
| visual-005 | visual | expense-app | scored | 2/2 | 2 | 2 | 0 | 0 | 0 | 0 | — | 61.9 s |
| visual-006 | visual | swag-labs | scored | 1/1 | 6 | 2 | 4 | 0 | 0 | 0 | — | 79.2 s |
| visual-007 | visual | expense-app | scored | 0/0 | 4 | 4 | 0 | 0 | 0 | 0 | — | 132.8 s |
| visual-008 | visual | expense-app | scored | 2/2 | 2 | 2 | 0 | 0 | 0 | 0 | — | 63.2 s |
| visual-009 | visual | expense-app | scored | 2/2 | 2 | 2 | 0 | 0 | 0 | 0 | — | 65.3 s |
| visual-010 | visual | expense-app | scored | 2/2 | 2 | 2 | 0 | 0 | 0 | 0 | — | 43.1 s |
| visual-011 | visual | swag-labs | scored | 0/0 | 4 | 3 | 0 | 0 | 0 | 1 | — | 165.3 s |
| visual-012 | visual | expense-app | scored | 0/0 | 4 | 4 | 0 | 0 | 0 | 0 | — | 94.7 s |

## Findings

<details><summary>visual-001: 3 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.login-error-invisible` [visual]: first finding to hit defect expense.login-error-invisible: matches expense.login-error-invisible[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.low-contrast-text` [a11y]: first finding to hit defect expense.low-contrast-text: matches expense.low-contrast-text[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.long-title-overflows` [visual]: first finding to hit defect expense.long-title-overflows: matches expense.long-title-overflows[0]: route, role, category; locators not comparable

</details>

<details><summary>visual-002: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.total-covers-last-row` [visual]: first finding to hit defect expense.total-covers-last-row: matches expense.total-covers-last-row[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.focus-ring-removed` [a11y]: first finding to hit defect expense.focus-ring-removed: matches expense.focus-ring-removed[0]: route, role, category; finding has no locator

</details>

<details><summary>visual-003: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.phone-layout-overflow` [visual]: first finding to hit defect expense.phone-layout-overflow: matches expense.phone-layout-overflow[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.amounts-misaligned` [visual]: first finding to hit defect expense.amounts-misaligned: matches expense.amounts-misaligned[0]: route, role, category; locators not comparable

</details>

<details><summary>visual-004: 6 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.visual-user` [visual]: first finding to hit defect swag.visual-user: matches swag.visual-user[6]: route, role, category and selector
- `f2` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[9]: route, role, category; locators not comparable
- `f3` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[12]: route, role, category; locators not comparable
- `f4` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[0]: route, role, category; finding has no locator
- `f5` **duplicate** → `swag.visual-user` [consistency]: defect swag.visual-user already found by f1: matches swag.visual-user[13]: route, role, category; locators not comparable
- `f6` **true_positive** → `swag.focus-indicator-missing` [a11y]: first finding to hit defect swag.focus-indicator-missing: matches swag.focus-indicator-missing[0]: route, role, category; finding has no locator

</details>

<details><summary>visual-005: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.login-error-invisible` [visual]: first finding to hit defect expense.login-error-invisible: matches expense.login-error-invisible[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.focus-ring-removed` [a11y]: first finding to hit defect expense.focus-ring-removed: matches expense.focus-ring-removed[0]: route, role, category; locators not comparable

</details>

<details><summary>visual-006: 6 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.visual-user` [visual]: first finding to hit defect swag.visual-user: matches swag.visual-user[6]: route, role, category and selector
- `f2` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[9]: route, role, category; locators not comparable
- `f3` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[0]: route, role, category and selector
- `f4` **true_positive** → `swag.focus-indicator-missing` [a11y]: first finding to hit defect swag.focus-indicator-missing: matches swag.focus-indicator-missing[0]: route, role, category; finding has no locator
- `f5` **duplicate** → `swag.visual-user` [consistency]: defect swag.visual-user already found by f1: matches swag.visual-user[5]: route, role, category and selector
- `f6` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[3]: route, role, category and selector

</details>

<details><summary>visual-007: 4 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.unbroken-title-overflows` [visual]: first finding to hit defect expense.unbroken-title-overflows: matches expense.unbroken-title-overflows[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.row-actions-unnamed` [a11y]: first finding to hit defect expense.row-actions-unnamed: matches expense.row-actions-unnamed[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.phone-rows-unlabelled` [a11y]: first finding to hit defect expense.phone-rows-unlabelled: matches expense.phone-rows-unlabelled[0]: route, role, category; locators not comparable
- `f4` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; locators not comparable

</details>

<details><summary>visual-008: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.low-contrast-text` [a11y]: first finding to hit defect expense.low-contrast-text: matches expense.low-contrast-text[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.long-title-overflows` [visual]: first finding to hit defect expense.long-title-overflows: matches expense.long-title-overflows[0]: route, role, category; locators not comparable

</details>

<details><summary>visual-009: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.phone-layout-overflow` [visual]: first finding to hit defect expense.phone-layout-overflow: matches expense.phone-layout-overflow[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.amounts-misaligned` [visual]: first finding to hit defect expense.amounts-misaligned: matches expense.amounts-misaligned[0]: route, role, category; locators not comparable

</details>

<details><summary>visual-010: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.total-covers-last-row` [visual]: first finding to hit defect expense.total-covers-last-row: matches expense.total-covers-last-row[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.focus-ring-removed` [a11y]: first finding to hit defect expense.focus-ring-removed: matches expense.focus-ring-removed[0]: route, role, category; finding has no locator

</details>

<details><summary>visual-011: 4 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.focus-indicator-missing` [a11y]: first finding to hit defect swag.focus-indicator-missing: matches swag.focus-indicator-missing[0]: route, role, category; finding has no locator
- `f2` **true_positive** → `swag.cart-link-not-focusable` [a11y]: first finding to hit defect swag.cart-link-not-focusable: matches swag.cart-link-not-focusable[0]: route, role, category; locators not comparable
- `f3` **unmatched** [visual]: no label matched; closest: description does not mention the symptom (/^(?![\s\S]*(inventory-item|item page|product page|id=\d|unknown (product|item)))(?=[\s\S]*((unknown|non-?existent|invalid|bad|missing|wrong|random|mistyped|undefined) (url|path|route|page|address)s?|/nonexistent|/no-such|\b404\b))(?=[\s\S]*(blank|empty|white|nothing|no (404|error|message|content|navigation)))/i) for swag.blank-not-found-page
- `f4` **true_positive** → `swag.small-tap-targets` [a11y]: first finding to hit defect swag.small-tap-targets: matches swag.small-tap-targets[0]: route, role, category; locators not comparable

</details>

<details><summary>visual-012: 4 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.unbroken-title-overflows` [visual]: first finding to hit defect expense.unbroken-title-overflows: matches expense.unbroken-title-overflows[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.row-actions-unnamed` [a11y]: first finding to hit defect expense.row-actions-unnamed: matches expense.row-actions-unnamed[0]: route, role, category; locators not comparable
- `f4` **true_positive** → `expense.phone-rows-unlabelled` [a11y]: first finding to hit defect expense.phone-rows-unlabelled: matches expense.phone-rows-unlabelled[0]: route, role, category; locators not comparable

</details>
