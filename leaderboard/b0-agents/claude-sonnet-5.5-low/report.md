# QA Bench report: claude-sonnet-5.5-low claude-sonnet-5-5@low (bench 0.1.0-b0)

- Run: `ag-claude-sonnet-5.5-low`
- Generated: 2026-11-05T05:12:33.490Z
- Tracks: noise, regression
- Seeds: noise=20261106, regression=20261105
- Upstreams: expense-app, swag-labs, the-internet
- Matcher: deterministic-2

## Headline

| Metric | Value |
|---|---|
| Recall | 100.0% (6/6 defects) |
| Severity-weighted recall | 100.0% (24/24 weight; critical 5, major 3, minor 1) |
| Precision | 87.5% |
| F1 | 93.3% |
| Severity-weighted F1 | 93.3% |
| False alarms per 100 episodes | 10.0 |
| Unmatched findings per episode | 0.10 |
| Mean time to first detection | — |
| Cost | $0.59 (per defect found: $0.10) |
| Human hours | — |
| Wall time | 677.7 s |
| Severity agreement | — (no finding stated a severity) |
| Episodes scored | 10/10 |

## By track

| Track | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| noise | 2 | 0/0 | — | — | — | 0/1 | 0.0 | 0.00 |
| regression | 8 | 6/6 | 100.0% | 87.5% | 93.3% | 1/6 | 12.5 | 0.13 |

## By category and class

| Track | Category | Class | Defects found | Recall | Precision | Unmatched |
|---|---|---|---|---|---|---|
| noise | copy | judged | 0/0 | — | — | 0 |
| noise | error-handling | deterministic | 0/0 | — | — | 0 |
| noise | functional | deterministic | 0/0 | — | — | 0 |
| noise | perf | deterministic | 0/0 | — | — | 0 |
| noise | visual | deterministic | 0/0 | — | — | 0 |
| noise | visual | judged | 0/0 | — | — | 0 |
| regression | consistency | deterministic | 2/2 | 100.0% | — | 0 |
| regression | copy | judged | 0/0 | — | 0.0% | 0 |
| regression | error-handling | deterministic | 1/1 | 100.0% | — | 0 |
| regression | functional | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| regression | permission | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| regression | visual | judged | 1/1 | 100.0% | 50.0% | 1 |

Per category

| Category | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| consistency | 10 | 2/2 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| copy | 10 | 0/0 | — | 0.0% | — | 1/6 | 10.0 | 0.00 |
| error-handling | 10 | 1/1 | 100.0% | — | — | 0/0 | 0.0 | 0.00 |
| functional | 10 | 1/1 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| perf | 10 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| permission | 10 | 1/1 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| visual | 10 | 1/1 | 100.0% | 66.7% | 80.0% | 0/1 | 0.0 | 0.10 |

Per class

| Class | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| deterministic | 10 | 5/5 | 100.0% | 92.3% | 96.0% | 0/0 | 0.0 | 0.10 |
| judged | 10 | 1/1 | 100.0% | 50.0% | 66.7% | 1/7 | 10.0 | 0.10 |

## Episodes

| Episode | Track | App | Status | Defects found | Findings | TP | Dup | Change FA | Excused | Unmatched | First detection | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| regression-001 | regression | expense-app | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 52.5 s |
| regression-003 | regression | expense-app | scored | 1/1 | 1 | 1 | 0 | 0 | 0 | 0 | — | 53.3 s |
| regression-006 | regression | expense-app | scored | 1/1 | 1 | 1 | 0 | 0 | 0 | 0 | — | 47.8 s |
| regression-007 | regression | swag-labs | scored | 1/1 | 3 | 1 | 2 | 0 | 0 | 0 | — | 87.3 s |
| regression-009 | regression | swag-labs | scored | 1/1 | 7 | 1 | 5 | 0 | 0 | 1 | — | 170.3 s |
| regression-011 | regression | swag-labs | scored | 1/1 | 2 | 1 | 1 | 0 | 0 | 0 | — | 46.5 s |
| regression-014 | regression | expense-app | scored | 1/1 | 1 | 1 | 0 | 0 | 0 | 0 | — | 97.2 s |
| regression-016 | regression | swag-labs | scored | 0/0 | 1 | 0 | 0 | 1 | 0 | 0 | — | 62.4 s |
| noise-001 | noise | the-internet | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 29.1 s |
| noise-002 | noise | the-internet | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 31.3 s |

## Findings

<details><summary>regression-001: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>regression-003: 1 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.permission-bypass` [permission]: first finding to hit defect expense.permission-bypass: matches expense.permission-bypass[0]: route, role, category; finding has no locator

</details>

<details><summary>regression-006: 1 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.wrong-total` [functional]: first finding to hit defect expense.wrong-total: matches expense.wrong-total[0]: route, role, category and selector

</details>

<details><summary>regression-007: 3 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.error-user` [functional]: first finding to hit defect swag.error-user: matches swag.error-user[8]: route, role, category and selector
- `f2` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[10]: route, role, category; finding has no locator
- `f3` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[14]: route, role, category and selector

</details>

<details><summary>regression-009: 7 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.problem-user` [functional]: first finding to hit defect swag.problem-user: matches swag.problem-user[7]: route, role, category and selector
- `f2` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[1]: route, role, category; finding has no locator
- `f3` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[8]: route, role, category; locators not comparable
- `f4` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[9]: route, role, category; finding has no locator
- `f5` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[12]: route, role, category; finding has no locator
- `f6` **unmatched** [visual]: no label matched; closest: category visual ≠ functional (family presentation ≠ behaviour) for swag.problem-user
- `f7` **duplicate** → `swag.problem-user` [visual]: defect swag.problem-user already found by f1: matches swag.problem-user[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-011: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.visual-user` [consistency]: first finding to hit defect swag.visual-user: matches swag.visual-user[5]: route, role, category and selector
- `f2` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[2]: route, role, category and selector

</details>

<details><summary>regression-014: 1 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.stale-state` [functional]: first finding to hit defect expense.stale-state: matches expense.stale-state[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-016: 1 finding(s), status scored</summary>

- `f1` **false_alarm_change** → `swag.relabel` [copy]: flags deliberate change swag.relabel: matches swag.relabel[0]: route, role, category; finding has no locator

</details>

<details><summary>noise-001: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>noise-002: 0 finding(s), status scored</summary>

_No findings._

</details>
