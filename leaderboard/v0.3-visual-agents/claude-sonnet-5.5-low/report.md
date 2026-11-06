# QA Bench report: claude-sonnet-5.5-low claude-sonnet-5-5@low (bench 0.2.0-dev)

- Run: `v3-claude-sonnet-5.5-low`
- Generated: 2026-11-06T07:26:10.286Z
- Tracks: visual
- Seeds: visual=20261106
- Upstreams: expense-app, swag-labs
- Matcher: deterministic-3

## Headline

| Metric | Value |
|---|---|
| Recall | 64.7% (11/17 defects) |
| Recall (novel defects) | 60.0% (9/15 novel defects) |
| Recall (known, publicly documented) | 100.0% (2/2 known defects) |
| Recall (subtle) | 33.3% (3/9 subtle defects) |
| Recall (blatant) | 100.0% (8/8 blatant defects) |
| Recall (visual) | 66.7% (8/12 visual defects) |
| Recall (accessibility) | 60.0% (3/5 accessibility defects) |
| Severity-weighted recall | 65.9% (27/41 weight; critical 5, major 3, minor 1) |
| Natural defects found | 2.5% (4/160 verified real bugs nobody planted) |
| Precision | 95.5% |
| F1 | 77.1% |
| Severity-weighted F1 | 77.9% |
| False alarms per 100 episodes | 0.0 |
| Unmatched findings per episode | 0.08 |
| Mean time to first detection | — |
| Cost | $0.18 (per defect found: $0.02) |
| Human hours | — |
| Wall time | 461.3 s |
| Activity per episode | 9.5 tool calls, 2.3 screenshots taken, 2.8 looked at (12 episodes reported) |
| Severity agreement | 73.3% of 15 true positives that stated a severity |
| Episodes scored | 12/12 |

## By track

| Track | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| visual | 12 | 11/17 | 64.7% | 95.5% | 77.1% | 0/5 | 0.0 | 0.08 |

## By category and class

| Track | Category | Class | Defects found | Recall | Precision | Unmatched |
|---|---|---|---|---|---|---|
| visual | a11y | deterministic | 3/5 | 60.0% | 100.0% | 0 |
| visual | copy | deterministic | 0/0 | — | — | 0 |
| visual | error-handling | deterministic | 0/0 | — | — | 0 |
| visual | functional | deterministic | 0/0 | — | — | 0 |
| visual | security-hygiene | deterministic | 0/0 | — | — | 0 |
| visual | usability | deterministic | 0/0 | — | — | 0 |
| visual | visual | deterministic | 6/10 | 60.0% | 85.7% | 1 |
| visual | visual | judged | 2/2 | 100.0% | 85.7% | 1 |

Per category

| Category | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| a11y | 12 | 3/5 | 60.0% | 100.0% | 75.0% | 0/0 | 0.0 | 0.00 |
| consistency | 12 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |
| copy | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| error-handling | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| functional | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| security-hygiene | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| usability | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| visual | 12 | 8/12 | 66.7% | 92.3% | 77.4% | 0/5 | 0.0 | 0.08 |

Per class

| Class | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| deterministic | 12 | 9/15 | 60.0% | 92.9% | 72.9% | 0/0 | 0.0 | 0.08 |
| judged | 12 | 2/2 | 100.0% | 88.9% | 94.1% | 0/5 | 0.0 | 0.08 |

## Episodes

| Episode | Track | App | Status | Defects found | Findings | TP | Dup | Change FA | Excused | Unmatched | First detection | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| visual-001 | visual | expense-app | scored | 1/3 | 1 | 1 | 0 | 0 | 0 | 0 | — | 38.6 s |
| visual-002 | visual | expense-app | scored | 1/2 | 1 | 1 | 0 | 0 | 0 | 0 | — | 35.4 s |
| visual-003 | visual | expense-app | scored | 2/2 | 2 | 2 | 0 | 0 | 0 | 0 | — | 37.4 s |
| visual-004 | visual | swag-labs | scored | 1/1 | 3 | 1 | 2 | 0 | 0 | 0 | — | 28.8 s |
| visual-005 | visual | expense-app | scored | 1/2 | 1 | 1 | 0 | 0 | 0 | 0 | — | 53.0 s |
| visual-006 | visual | swag-labs | scored | 1/1 | 5 | 1 | 4 | 0 | 0 | 0 | — | 30.9 s |
| visual-007 | visual | expense-app | scored | 0/0 | 1 | 1 | 0 | 0 | 0 | 0 | — | 60.8 s |
| visual-008 | visual | expense-app | scored | 1/2 | 2 | 2 | 0 | 0 | 0 | 0 | — | 38.5 s |
| visual-009 | visual | expense-app | scored | 2/2 | 2 | 2 | 0 | 0 | 0 | 0 | — | 29.9 s |
| visual-010 | visual | expense-app | scored | 1/2 | 1 | 1 | 0 | 0 | 0 | 0 | — | 23.0 s |
| visual-011 | visual | swag-labs | scored | 0/0 | 1 | 0 | 0 | 0 | 0 | 1 | — | 27.7 s |
| visual-012 | visual | expense-app | scored | 0/0 | 2 | 2 | 0 | 0 | 0 | 0 | — | 57.3 s |

## Findings

<details><summary>visual-001: 1 finding(s), status scored</summary>

Missed defects: `expense.login-error-invisible`, `expense.long-title-overflows`

- `f1` **true_positive** → `expense.low-contrast-text` [a11y]: first finding to hit defect expense.low-contrast-text: matches expense.low-contrast-text[0]: route, role, category; finding has no locator

</details>

<details><summary>visual-002: 1 finding(s), status scored</summary>

Missed defects: `expense.focus-ring-removed`

- `f1` **true_positive** → `expense.total-covers-last-row` [visual]: first finding to hit defect expense.total-covers-last-row: matches expense.total-covers-last-row[0]: route, role, category; finding has no locator

</details>

<details><summary>visual-003: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.phone-layout-overflow` [visual]: first finding to hit defect expense.phone-layout-overflow: matches expense.phone-layout-overflow[0]: route, role, category; finding has no locator
- `f2` **true_positive** → `expense.amounts-misaligned` [visual]: first finding to hit defect expense.amounts-misaligned: matches expense.amounts-misaligned[0]: route, role, category; finding has no locator

</details>

<details><summary>visual-004: 3 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.visual-user` [visual]: first finding to hit defect swag.visual-user: matches swag.visual-user[9]: route, role, category; finding has no locator
- `f2` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[12]: route, role, category; finding has no locator
- `f3` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[12]: route, role, category; finding has no locator

</details>

<details><summary>visual-005: 1 finding(s), status scored</summary>

Missed defects: `expense.login-error-invisible`

- `f1` **true_positive** → `expense.focus-ring-removed` [a11y]: first finding to hit defect expense.focus-ring-removed: matches expense.focus-ring-removed[0]: route, role, category; finding has no locator

</details>

<details><summary>visual-006: 5 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.visual-user` [visual]: first finding to hit defect swag.visual-user: matches swag.visual-user[9]: route, role, category; finding has no locator
- `f2` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[12]: route, role, category; finding has no locator
- `f3` **duplicate** → `swag.visual-user` [consistency]: defect swag.visual-user already found by f1: matches swag.visual-user[5]: route, role, category; finding has no locator
- `f4` **duplicate** → `swag.visual-user` [consistency]: defect swag.visual-user already found by f1: matches swag.visual-user[13]: route, role, category; finding has no locator
- `f5` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[0]: route, role, category; finding has no locator

</details>

<details><summary>visual-007: 1 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.row-actions-unnamed` [a11y]: first finding to hit defect expense.row-actions-unnamed: matches expense.row-actions-unnamed[0]: route, role, category; locators not comparable

</details>

<details><summary>visual-008: 2 finding(s), status scored</summary>

Missed defects: `expense.long-title-overflows`

- `f1` **true_positive** → `expense.low-contrast-text` [a11y]: first finding to hit defect expense.low-contrast-text: matches expense.low-contrast-text[0]: route, role, category; finding has no locator
- `f2` **true_positive** → `expense.row-actions-unnamed` [a11y]: first finding to hit defect expense.row-actions-unnamed: matches expense.row-actions-unnamed[0]: route, role, category; finding has no locator

</details>

<details><summary>visual-009: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.phone-layout-overflow` [visual]: first finding to hit defect expense.phone-layout-overflow: matches expense.phone-layout-overflow[0]: route, role, category; finding has no locator
- `f2` **true_positive** → `expense.amounts-misaligned` [visual]: first finding to hit defect expense.amounts-misaligned: matches expense.amounts-misaligned[0]: route, role, category; finding has no locator

</details>

<details><summary>visual-010: 1 finding(s), status scored</summary>

Missed defects: `expense.focus-ring-removed`

- `f1` **true_positive** → `expense.total-covers-last-row` [visual]: first finding to hit defect expense.total-covers-last-row: matches expense.total-covers-last-row[0]: route, role, category; finding has no locator

</details>

<details><summary>visual-011: 1 finding(s), status scored</summary>

- `f1` **unmatched** [visual]: no label matched; closest: description does not mention the symptom (/^(?![\s\S]*(inventory-item|item page|product page|id=\d|unknown (product|item)))(?=[\s\S]*((unknown|non-?existent|invalid|bad|missing|wrong|random|mistyped|undefined) (url|path|route|page|address)s?|/nonexistent|/no-such|\b404\b))(?=[\s\S]*(blank|empty|white|nothing|no (404|error|message|content|navigation)))/i) for swag.blank-not-found-page

</details>

<details><summary>visual-012: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.small-touch-targets` [a11y]: first finding to hit defect expense.small-touch-targets: matches expense.small-touch-targets[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.row-actions-unnamed` [a11y]: first finding to hit defect expense.row-actions-unnamed: matches expense.row-actions-unnamed[0]: route, role, category; locators not comparable

</details>
