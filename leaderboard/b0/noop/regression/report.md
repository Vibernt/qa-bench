# QA Bench report: noop 0.1.0 (bench 0.1.0-b0)

- Run: `b0-noop-regression`
- Generated: 2026-11-05T05:12:30.831Z
- Tracks: regression
- Seeds: regression=20261105
- Upstreams: expense-app, swag-labs
- Matcher: deterministic-2

## Headline

| Metric | Value |
|---|---|
| Recall | 0.0% (0/12 defects) |
| Severity-weighted recall | 0.0% (0/50 weight; critical 5, major 3, minor 1) |
| Precision | — |
| F1 | — |
| Severity-weighted F1 | — |
| False alarms per 100 episodes | 0.0 |
| Unmatched findings per episode | 0.00 |
| Mean time to first detection | — |
| Cost | $0.00 (per defect found: —) |
| Human hours | — |
| Wall time | 9.3 s |
| Severity agreement | — (no finding stated a severity) |
| Episodes scored | 17/17 |

## By track

| Track | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| regression | 17 | 0/12 | 0.0% | — | — | 0/11 | 0.0 | 0.00 |

## By category and class

| Track | Category | Class | Defects found | Recall | Precision | Unmatched |
|---|---|---|---|---|---|---|
| regression | consistency | deterministic | 0/2 | 0.0% | — | 0 |
| regression | consistency | judged | 0/0 | — | — | 0 |
| regression | copy | judged | 0/0 | — | — | 0 |
| regression | error-handling | deterministic | 0/1 | 0.0% | — | 0 |
| regression | functional | deterministic | 0/6 | 0.0% | — | 0 |
| regression | perf | deterministic | 0/1 | 0.0% | — | 0 |
| regression | permission | deterministic | 0/1 | 0.0% | — | 0 |
| regression | visual | judged | 0/1 | 0.0% | — | 0 |

Per category

| Category | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| consistency | 17 | 0/2 | 0.0% | — | — | 0/1 | 0.0 | 0.00 |
| copy | 17 | 0/0 | — | — | — | 0/8 | 0.0 | 0.00 |
| error-handling | 17 | 0/1 | 0.0% | — | — | 0/0 | 0.0 | 0.00 |
| functional | 17 | 0/6 | 0.0% | — | — | 0/0 | 0.0 | 0.00 |
| perf | 17 | 0/1 | 0.0% | — | — | 0/0 | 0.0 | 0.00 |
| permission | 17 | 0/1 | 0.0% | — | — | 0/0 | 0.0 | 0.00 |
| visual | 17 | 0/1 | 0.0% | — | — | 0/2 | 0.0 | 0.00 |

Per class

| Class | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| deterministic | 17 | 0/11 | 0.0% | — | — | 0/0 | 0.0 | 0.00 |
| judged | 17 | 0/1 | 0.0% | — | — | 0/11 | 0.0 | 0.00 |

## Episodes

| Episode | Track | App | Status | Defects found | Findings | TP | Dup | Change FA | Excused | Unmatched | First detection | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| regression-001 | regression | expense-app | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.6 s |
| regression-002 | regression | swag-labs | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.6 s |
| regression-003 | regression | expense-app | scored | 0/1 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.5 s |
| regression-004 | regression | expense-app | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.6 s |
| regression-005 | regression | expense-app | scored | 0/1 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.5 s |
| regression-006 | regression | expense-app | scored | 0/1 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.7 s |
| regression-007 | regression | swag-labs | scored | 0/1 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.8 s |
| regression-008 | regression | expense-app | scored | 0/1 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.6 s |
| regression-009 | regression | swag-labs | scored | 0/1 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.4 s |
| regression-010 | regression | expense-app | scored | 0/1 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.6 s |
| regression-011 | regression | swag-labs | scored | 0/1 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.6 s |
| regression-012 | regression | expense-app | scored | 0/1 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.5 s |
| regression-013 | regression | swag-labs | scored | 0/1 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.4 s |
| regression-014 | regression | expense-app | scored | 0/1 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.5 s |
| regression-015 | regression | swag-labs | scored | 0/1 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.5 s |
| regression-016 | regression | swag-labs | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.5 s |
| regression-017 | regression | swag-labs | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0.4 s |

## Findings

<details><summary>regression-001: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>regression-002: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>regression-003: 0 finding(s), status scored</summary>

Missed defects: `expense.permission-bypass`

_No findings._

</details>

<details><summary>regression-004: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>regression-005: 0 finding(s), status scored</summary>

Missed defects: `expense.ignored-filter`

_No findings._

</details>

<details><summary>regression-006: 0 finding(s), status scored</summary>

Missed defects: `expense.wrong-total`

_No findings._

</details>

<details><summary>regression-007: 0 finding(s), status scored</summary>

Missed defects: `swag.error-user`

_No findings._

</details>

<details><summary>regression-008: 0 finding(s), status scored</summary>

Missed defects: `expense.misleading-success`

_No findings._

</details>

<details><summary>regression-009: 0 finding(s), status scored</summary>

Missed defects: `swag.problem-user`

_No findings._

</details>

<details><summary>regression-010: 0 finding(s), status scored</summary>

Missed defects: `expense.duplicate-write`

_No findings._

</details>

<details><summary>regression-011: 0 finding(s), status scored</summary>

Missed defects: `swag.visual-user`

_No findings._

</details>

<details><summary>regression-012: 0 finding(s), status scored</summary>

Missed defects: `expense.missing-persistence`

_No findings._

</details>

<details><summary>regression-013: 0 finding(s), status scored</summary>

Missed defects: `swag.performance-glitch-user`

_No findings._

</details>

<details><summary>regression-014: 0 finding(s), status scored</summary>

Missed defects: `expense.stale-state`

_No findings._

</details>

<details><summary>regression-015: 0 finding(s), status scored</summary>

Missed defects: `swag.locked-out-user`

_No findings._

</details>

<details><summary>regression-016: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>regression-017: 0 finding(s), status scored</summary>

_No findings._

</details>
