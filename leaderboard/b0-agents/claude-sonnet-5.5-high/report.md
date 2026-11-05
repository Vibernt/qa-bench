# QA Bench report: claude-sonnet-5.5-high claude-sonnet-5-5@high (bench 0.1.0-b0)

- Run: `ag-claude-sonnet-5.5-high`
- Generated: 2026-11-05T05:23:11.225Z
- Tracks: noise, regression
- Seeds: noise=20261106, regression=20261105
- Upstreams: expense-app, swag-labs, the-internet
- Matcher: deterministic-3

## Headline

| Metric | Value |
|---|---|
| Recall | 100.0% (6/6 defects) |
| Severity-weighted recall | 100.0% (24/24 weight; critical 5, major 3, minor 1) |
| Natural defects found | 10.0% (2/20 verified real bugs nobody planted) |
| Precision | 96.0% |
| F1 | 98.0% |
| Severity-weighted F1 | 98.0% |
| False alarms per 100 episodes | 0.0 |
| Unmatched findings per episode | 0.10 |
| Mean time to first detection | — |
| Cost | $0.75 (per defect found: $0.12) |
| Human hours | — |
| Wall time | 1605.0 s |
| Severity agreement | — (no finding stated a severity) |
| Episodes scored | 10/10 |

## By track

| Track | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| noise | 2 | 0/0 | — | — | — | 0/1 | 0.0 | 0.00 |
| regression | 8 | 6/6 | 100.0% | 96.0% | 98.0% | 0/6 | 0.0 | 0.13 |

## By category and class

| Track | Category | Class | Defects found | Recall | Precision | Unmatched |
|---|---|---|---|---|---|---|
| noise | copy | deterministic | 0/0 | — | — | 0 |
| noise | copy | judged | 0/0 | — | — | 0 |
| noise | error-handling | deterministic | 0/0 | — | — | 0 |
| noise | functional | deterministic | 0/0 | — | — | 0 |
| noise | perf | deterministic | 0/0 | — | — | 0 |
| noise | visual | deterministic | 0/0 | — | — | 0 |
| noise | visual | judged | 0/0 | — | — | 0 |
| regression | a11y | deterministic | 0/0 | — | — | 0 |
| regression | consistency | deterministic | 2/2 | 100.0% | — | 0 |
| regression | copy | deterministic | 0/0 | — | — | 0 |
| regression | copy | judged | 0/0 | — | — | 0 |
| regression | error-handling | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| regression | functional | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| regression | permission | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| regression | visual | judged | 1/1 | 100.0% | 75.0% | 1 |

Per category

| Category | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| a11y | 10 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| consistency | 10 | 2/2 | 100.0% | — | — | 0/0 | 0.0 | 0.00 |
| copy | 10 | 0/0 | — | — | — | 0/6 | 0.0 | 0.00 |
| error-handling | 10 | 1/1 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| functional | 10 | 1/1 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| perf | 10 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| permission | 10 | 1/1 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| visual | 10 | 1/1 | 100.0% | 80.0% | 88.9% | 0/1 | 0.0 | 0.10 |

Per class

| Class | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| deterministic | 10 | 5/5 | 100.0% | 95.2% | 97.6% | 0/0 | 0.0 | 0.10 |
| judged | 10 | 1/1 | 100.0% | 80.0% | 88.9% | 0/7 | 0.0 | 0.10 |

## Episodes

| Episode | Track | App | Status | Defects found | Findings | TP | Dup | Change FA | Excused | Unmatched | First detection | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| regression-001 | regression | expense-app | scored | 0/0 | 1 | 1 | 0 | 0 | 0 | 0 | — | 80.3 s |
| regression-003 | regression | expense-app | scored | 1/1 | 1 | 1 | 0 | 0 | 0 | 0 | — | 55.0 s |
| regression-006 | regression | expense-app | scored | 1/1 | 1 | 1 | 0 | 0 | 0 | 0 | — | 70.6 s |
| regression-007 | regression | swag-labs | scored | 1/1 | 6 | 1 | 5 | 0 | 0 | 0 | — | 526.8 s |
| regression-009 | regression | swag-labs | scored | 1/1 | 8 | 1 | 7 | 0 | 0 | 0 | — | 311.1 s |
| regression-011 | regression | swag-labs | scored | 1/1 | 5 | 1 | 3 | 0 | 0 | 1 | — | 117.8 s |
| regression-014 | regression | expense-app | scored | 1/1 | 2 | 1 | 1 | 0 | 0 | 0 | — | 82.9 s |
| regression-016 | regression | swag-labs | scored | 0/0 | 1 | 1 | 0 | 0 | 0 | 0 | — | 143.8 s |
| noise-001 | noise | the-internet | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 59.5 s |
| noise-002 | noise | the-internet | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 157.2 s |

## Findings

<details><summary>regression-001: 1 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-003: 1 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.permission-bypass` [permission]: first finding to hit defect expense.permission-bypass: matches expense.permission-bypass[0]: route, role, category; finding has no locator

</details>

<details><summary>regression-006: 1 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.wrong-total` [functional]: first finding to hit defect expense.wrong-total: matches expense.wrong-total[0]: route, role, category and selector

</details>

<details><summary>regression-007: 6 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.error-user` [functional]: first finding to hit defect swag.error-user: matches swag.error-user[8]: route, role, category and selector
- `f2` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[4]: route, role, category and selector
- `f3` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[10]: route, role, category; locators not comparable
- `f4` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[2]: route, role, category and selector
- `f5` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[10]: route, role, category; locators not comparable
- `f6` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[14]: route, role, category and selector

</details>

<details><summary>regression-009: 8 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.problem-user` [functional]: first finding to hit defect swag.problem-user: matches swag.problem-user[7]: route, role, category and selector
- `f2` **duplicate** → `swag.problem-user` [visual]: defect swag.problem-user already found by f1: matches swag.problem-user[0]: route, role, category; locators not comparable
- `f3` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[8]: route, role, category; locators not comparable
- `f4` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[5]: route, role, category and selector
- `f5` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[1]: route, role, category; finding has no locator
- `f6` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[12]: route, role, category and selector
- `f7` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[14]: route, role, category and selector
- `f8` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[16]: route, role, category and selector

</details>

<details><summary>regression-011: 5 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.visual-user` [functional]: first finding to hit defect swag.visual-user: matches swag.visual-user[5]: route, role, category and selector
- `f2` **unmatched** [visual]: no label matched; closest: locator mismatch (selector [data-test="inventory-item"] img vs [data-test=shopping-cart-link]) for swag.visual-user; locator mismatch (selector [data-test="inventory-item"] img vs [data-test=open-menu]) for swag.visual-user; locator mismatch (selector [data-test="inventory-item"] img vs [data-test=inventory-item-sauce-labs-backpack-img]) for swag.visual-user; locator mismatch (selector [data-test="inventory-item"] img vs [data-test=inventory-item-name]) for swag.visual-user; locator mismatch (selector [data-test="inventory-item"] img vs [data-test=add-to-cart-test.allthethings()-t-shirt-(red)]) for swag.visual-user
- `f3` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[3]: route, role, category and selector
- `f4` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[4]: route, role, category and selector
- `f5` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[6]: route, role, category and selector

</details>

<details><summary>regression-014: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.stale-state` [functional]: first finding to hit defect expense.stale-state: matches expense.stale-state[0]: route, role, category; locators not comparable
- `f2` **duplicate** → `expense.stale-state` [functional]: defect expense.stale-state already found by f1: matches expense.stale-state[0]: route, role, category; finding has no locator

</details>

<details><summary>regression-016: 1 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.unrounded-item-total` [functional]: first finding to hit defect swag.unrounded-item-total: matches swag.unrounded-item-total[0]: route, role, category and selector

</details>

<details><summary>noise-001: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>noise-002: 0 finding(s), status scored</summary>

_No findings._

</details>
