# QA Bench report: playwright-suite 0.1.0 (bench 0.2.0-dev)

- Run: `v3-playwright-suite`
- Generated: 2026-11-06T07:26:12.484Z
- Tracks: visual
- Seeds: visual=20261106
- Upstreams: expense-app, swag-labs
- Matcher: deterministic-3

## Headline

| Metric | Value |
|---|---|
| Recall | 11.8% (2/17 defects) |
| Recall (novel defects) | 0.0% (0/15 novel defects) |
| Recall (known, publicly documented) | 100.0% (2/2 known defects) |
| Recall (subtle) | 0.0% (0/9 subtle defects) |
| Recall (blatant) | 25.0% (2/8 blatant defects) |
| Recall (visual) | 16.7% (2/12 visual defects) |
| Recall (accessibility) | 0.0% (0/5 accessibility defects) |
| Severity-weighted recall | 14.6% (6/41 weight; critical 5, major 3, minor 1) |
| Natural defects found | 0.0% (0/160 verified real bugs nobody planted) |
| Precision | 100.0% |
| F1 | 21.1% |
| Severity-weighted F1 | 25.5% |
| False alarms per 100 episodes | 0.0 |
| Unmatched findings per episode | 0.00 |
| Mean time to first detection | 11.4 s |
| Cost | $0.00 (per defect found: $0.00) |
| Human hours | — |
| Wall time | 242.7 s |
| Severity agreement | — (no finding stated a severity) |
| Episodes scored | 12/12 |

## By track

| Track | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| visual | 12 | 2/17 | 11.8% | 100.0% | 21.1% | 0/5 | 0.0 | 0.00 |

## By category and class

| Track | Category | Class | Defects found | Recall | Precision | Unmatched |
|---|---|---|---|---|---|---|
| visual | a11y | deterministic | 0/5 | 0.0% | — | 0 |
| visual | copy | deterministic | 0/0 | — | — | 0 |
| visual | error-handling | deterministic | 0/0 | — | — | 0 |
| visual | functional | deterministic | 0/0 | — | — | 0 |
| visual | security-hygiene | deterministic | 0/0 | — | — | 0 |
| visual | usability | deterministic | 0/0 | — | — | 0 |
| visual | visual | deterministic | 0/10 | 0.0% | — | 0 |
| visual | visual | judged | 2/2 | 100.0% | 100.0% | 0 |

Per category

| Category | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| a11y | 12 | 0/5 | 0.0% | — | — | 0/0 | 0.0 | 0.00 |
| consistency | 12 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |
| copy | 12 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |
| error-handling | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| functional | 12 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |
| security-hygiene | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| usability | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| visual | 12 | 2/12 | 16.7% | 100.0% | 28.6% | 0/5 | 0.0 | 0.00 |

Per class

| Class | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| deterministic | 12 | 0/15 | 0.0% | — | — | 0/0 | 0.0 | 0.00 |
| judged | 12 | 2/2 | 100.0% | 100.0% | 100.0% | 0/5 | 0.0 | 0.00 |

## Episodes

| Episode | Track | App | Status | Defects found | Findings | TP | Dup | Change FA | Excused | Unmatched | First detection | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| visual-001 | visual | expense-app | scored | 0/3 | 0 | 0 | 0 | 0 | 0 | 0 | — | 38.5 s |
| visual-002 | visual | expense-app | scored | 0/2 | 0 | 0 | 0 | 0 | 0 | 0 | — | 38.7 s |
| visual-003 | visual | expense-app | scored | 0/2 | 0 | 0 | 0 | 0 | 0 | 0 | — | 38.5 s |
| visual-004 | visual | swag-labs | scored | 1/1 | 8 | 1 | 7 | 0 | 0 | 0 | 22.0 s | 52.0 s |
| visual-005 | visual | expense-app | scored | 0/2 | 0 | 0 | 0 | 0 | 0 | 0 | — | 8.9 s |
| visual-006 | visual | swag-labs | scored | 1/1 | 9 | 1 | 8 | 0 | 0 | 0 | 0.8 s | 11.3 s |
| visual-007 | visual | expense-app | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 9.1 s |
| visual-008 | visual | expense-app | scored | 0/2 | 0 | 0 | 0 | 0 | 0 | 0 | — | 8.9 s |
| visual-009 | visual | expense-app | scored | 0/2 | 0 | 0 | 0 | 0 | 0 | 0 | — | 9.1 s |
| visual-010 | visual | expense-app | scored | 0/2 | 0 | 0 | 0 | 0 | 0 | 0 | — | 9.1 s |
| visual-011 | visual | swag-labs | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 10.4 s |
| visual-012 | visual | expense-app | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 8.2 s |

## Findings

<details><summary>visual-001: 0 finding(s), status scored</summary>

Missed defects: `expense.login-error-invisible`, `expense.long-title-overflows`, `expense.low-contrast-text`

_No findings._

</details>

<details><summary>visual-002: 0 finding(s), status scored</summary>

Missed defects: `expense.focus-ring-removed`, `expense.total-covers-last-row`

_No findings._

</details>

<details><summary>visual-003: 0 finding(s), status scored</summary>

Missed defects: `expense.amounts-misaligned`, `expense.phone-layout-overflow`

_No findings._

</details>

<details><summary>visual-004: 8 finding(s), status scored</summary>

- `pw-001-swag-layout-grid` **true_positive** → `swag.visual-user` [visual]: first finding to hit defect swag.visual-user: matches swag.visual-user[2]: route, role, category and selector
- `pw-002-swag-layout-grid` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-layout-grid: matches swag.visual-user[3]: route, role, category and selector
- `pw-003-swag-layout-grid` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-layout-grid: matches swag.visual-user[4]: route, role, category and selector
- `pw-004-swag-layout-container` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-layout-grid: matches swag.visual-user[0]: route, role, category and selector
- `pw-005-swag-layout-rotated` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-layout-grid: matches swag.visual-user[1]: route, role, category and selector
- `pw-006-swag-sort` **duplicate** → `swag.visual-user` [functional]: defect swag.visual-user already found by pw-001-swag-layout-grid: matches swag.visual-user[8]: route, role, category and selector
- `pw-007-swag-detail-price` **duplicate** → `swag.visual-user` [consistency]: defect swag.visual-user already found by pw-001-swag-layout-grid: matches swag.visual-user[5]: route, role, category and selector
- `pw-008-swag-layout-container` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-layout-grid: matches swag.visual-user[6]: route, role, category and selector

</details>

<details><summary>visual-005: 0 finding(s), status scored</summary>

Missed defects: `expense.focus-ring-removed`, `expense.login-error-invisible`

_No findings._

</details>

<details><summary>visual-006: 9 finding(s), status scored</summary>

- `pw-001-swag-product-price-format` **true_positive** → `swag.visual-user` [copy]: first finding to hit defect swag.visual-user: matches swag.visual-user[11]: route, role, category; locators not comparable
- `pw-002-swag-layout-grid` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-product-price-format: matches swag.visual-user[2]: route, role, category and selector
- `pw-003-swag-layout-grid` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-product-price-format: matches swag.visual-user[3]: route, role, category and selector
- `pw-004-swag-layout-grid` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-product-price-format: matches swag.visual-user[4]: route, role, category and selector
- `pw-005-swag-layout-container` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-product-price-format: matches swag.visual-user[0]: route, role, category and selector
- `pw-006-swag-layout-rotated` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-product-price-format: matches swag.visual-user[1]: route, role, category and selector
- `pw-007-swag-sort` **duplicate** → `swag.visual-user` [functional]: defect swag.visual-user already found by pw-001-swag-product-price-format: matches swag.visual-user[8]: route, role, category and selector
- `pw-008-swag-detail-price` **duplicate** → `swag.visual-user` [consistency]: defect swag.visual-user already found by pw-001-swag-product-price-format: matches swag.visual-user[5]: route, role, category and selector
- `pw-009-swag-layout-container` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by pw-001-swag-product-price-format: matches swag.visual-user[6]: route, role, category and selector

</details>

<details><summary>visual-007: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>visual-008: 0 finding(s), status scored</summary>

Missed defects: `expense.long-title-overflows`, `expense.low-contrast-text`

_No findings._

</details>

<details><summary>visual-009: 0 finding(s), status scored</summary>

Missed defects: `expense.amounts-misaligned`, `expense.phone-layout-overflow`

_No findings._

</details>

<details><summary>visual-010: 0 finding(s), status scored</summary>

Missed defects: `expense.focus-ring-removed`, `expense.total-covers-last-row`

_No findings._

</details>

<details><summary>visual-011: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>visual-012: 0 finding(s), status scored</summary>

_No findings._

</details>
