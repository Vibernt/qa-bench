# QA Bench report: claude-haiku-5.5-high claude-haiku-5-5@high (bench 0.1.0-b0)

- Run: `ag-claude-haiku-5.5-high`
- Generated: 2026-11-05T05:23:09.715Z
- Tracks: noise, regression
- Seeds: noise=20261106, regression=20261105
- Upstreams: expense-app, swag-labs, the-internet
- Matcher: deterministic-3

## Headline

| Metric | Value |
|---|---|
| Recall | 100.0% (6/6 defects) |
| Severity-weighted recall | 100.0% (24/24 weight; critical 5, major 3, minor 1) |
| Natural defects found | 30.0% (6/20 verified real bugs nobody planted) |
| Precision | 84.8% |
| F1 | 91.8% |
| Severity-weighted F1 | 91.8% |
| False alarms per 100 episodes | 0.0 |
| Unmatched findings per episode | 0.50 |
| Mean time to first detection | — |
| Cost | $0.04 (per defect found: $0.01) |
| Human hours | — |
| Wall time | 3213.7 s |
| Severity agreement | — (no finding stated a severity) |
| Episodes scored | 10/10 |

## By track

| Track | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| noise | 2 | 0/0 | — | — | — | 0/1 | 0.0 | 0.00 |
| regression | 8 | 6/6 | 100.0% | 84.8% | 91.8% | 0/6 | 0.0 | 0.63 |

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
| regression | a11y | deterministic | 0/0 | — | 100.0% | 0 |
| regression | consistency | deterministic | 2/2 | 100.0% | — | 0 |
| regression | copy | deterministic | 0/0 | — | 0.0% | 1 |
| regression | copy | judged | 0/0 | — | 0.0% | 1 |
| regression | error-handling | deterministic | 1/1 | 100.0% | 83.3% | 1 |
| regression | functional | deterministic | 1/1 | 100.0% | 87.5% | 2 |
| regression | permission | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| regression | visual | judged | 1/1 | 100.0% | 80.0% | 1 |

Per category

| Category | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| a11y | 10 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |
| consistency | 10 | 2/2 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| copy | 10 | 0/0 | — | 0.0% | — | 0/6 | 0.0 | 0.10 |
| error-handling | 10 | 1/1 | 100.0% | 83.3% | 90.9% | 0/0 | 0.0 | 0.10 |
| functional | 10 | 1/1 | 100.0% | 88.2% | 93.8% | 0/0 | 0.0 | 0.20 |
| perf | 10 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| permission | 10 | 1/1 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| visual | 10 | 1/1 | 100.0% | 83.3% | 90.9% | 0/1 | 0.0 | 0.10 |

Per class

| Class | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| deterministic | 10 | 5/5 | 100.0% | 81.5% | 89.8% | 0/0 | 0.0 | 0.50 |
| judged | 10 | 1/1 | 100.0% | 54.5% | 70.6% | 0/7 | 0.0 | 0.50 |

## Episodes

| Episode | Track | App | Status | Defects found | Findings | TP | Dup | Change FA | Excused | Unmatched | First detection | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| regression-001 | regression | expense-app | scored | 0/0 | 2 | 2 | 0 | 0 | 0 | 0 | — | 232.8 s |
| regression-003 | regression | expense-app | scored | 1/1 | 3 | 3 | 0 | 0 | 0 | 0 | — | 216.1 s |
| regression-006 | regression | expense-app | scored | 1/1 | 2 | 2 | 0 | 0 | 0 | 0 | — | 119.7 s |
| regression-007 | regression | swag-labs | scored | 1/1 | 5 | 1 | 3 | 0 | 0 | 1 | — | 334.5 s |
| regression-009 | regression | swag-labs | scored | 1/1 | 10 | 1 | 7 | 0 | 0 | 2 | — | 424.3 s |
| regression-011 | regression | swag-labs | scored | 1/1 | 9 | 2 | 5 | 0 | 0 | 2 | — | 232.7 s |
| regression-014 | regression | expense-app | scored | 1/1 | 2 | 1 | 1 | 0 | 0 | 0 | — | 326.0 s |
| regression-016 | regression | swag-labs | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 184.3 s |
| noise-001 | noise | the-internet | scored | 0/0 | 2 | 0 | 0 | 0 | 2 | 0 | — | 996.9 s |
| noise-002 | noise | the-internet | scored | 0/0 | 2 | 0 | 0 | 0 | 2 | 0 | — | 146.4 s |

## Findings

<details><summary>regression-001: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.huge-amount-breaks-list` [error-handling]: first finding to hit defect expense.huge-amount-breaks-list: matches expense.huge-amount-breaks-list[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-003: 3 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.permission-bypass` [permission]: first finding to hit defect expense.permission-bypass: matches expense.permission-bypass[0]: route, role, category; finding has no locator
- `f2` **true_positive** → `expense.huge-amount-breaks-list` [error-handling]: first finding to hit defect expense.huge-amount-breaks-list: matches expense.huge-amount-breaks-list[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-006: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.wrong-total` [functional]: first finding to hit defect expense.wrong-total: matches expense.wrong-total[0]: route, role, category and selector
- `f2` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-007: 5 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.error-user` [functional]: first finding to hit defect swag.error-user: matches swag.error-user[4]: route, role, category and selector
- `f2` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[2]: route, role, category and selector
- `f3` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[8]: route, role, category and selector
- `f4` **unmatched** [copy]: no label matched; closest: description does not mention the symptom (/(not found|nonexist|non-exist|does not exist|doesn.t exist|unknown (product|item|id)|invalid id|id=\d{2,}|missing product)/i) for swag.not-found-item-page
- `f5` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[14]: route, role, category and selector

</details>

<details><summary>regression-009: 10 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.problem-user` [visual]: first finding to hit defect swag.problem-user: matches swag.problem-user[0]: route, role, category; locators not comparable
- `f2` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[7]: route, role, category and selector
- `f3` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[4]: route, role, category and selector
- `f4` **unmatched** [functional]: no label matched; closest: locator mismatch (selector [data-test="remove"] vs [data-test=inventory-item-name]) for swag.problem-user; locator mismatch (selector [data-test="remove"] vs [data-test=add-to-cart]) for swag.problem-user
- `f5` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[8]: route, role, category; locators not comparable
- `f6` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[2]: route, role, category and selector
- `f7` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[12]: route, role, category and selector
- `f8` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[14]: route, role, category and selector
- `f9` **unmatched** [functional]: no label matched; closest: locator mismatch (selector [data-test="shopping-cart-link"] vs [data-test=shopping-cart-badge]) for swag.problem-user
- `f10` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[17]: route, role, category and selector

</details>

<details><summary>regression-011: 9 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.visual-user` [functional]: first finding to hit defect swag.visual-user: matches swag.visual-user[5]: route, role, category and selector
- `f2` **duplicate** → `swag.visual-user` [consistency]: defect swag.visual-user already found by f1: matches swag.visual-user[5]: route, role, category and selector
- `f3` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[0]: route, role, category and selector
- `f4` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[4]: route, role, category and selector
- `f5` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[3]: route, role, category and selector
- `f6` **duplicate** → `swag.visual-user` [visual]: defect swag.visual-user already found by f1: matches swag.visual-user[6]: route, role, category and selector
- `f7` **unmatched** [visual]: no label matched; closest: route / ≠ /inventory.html for swag.visual-user; route / ≠ /cart.html for swag.visual-user
- `f8` **true_positive** → `swag.cart-count-grammar` [a11y]: first finding to hit defect swag.cart-count-grammar: matches swag.cart-count-grammar[0]: route, role, category and selector
- `f9` **unmatched** [error-handling]: no label matched; closest: route /nope.html ≠ /inventory.html for swag.visual-user; route /nope.html ≠ /cart.html for swag.visual-user

</details>

<details><summary>regression-014: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.stale-state` [functional]: first finding to hit defect expense.stale-state: matches expense.stale-state[0]: route, role, category; locators not comparable
- `f2` **duplicate** → `expense.stale-state` [functional]: defect expense.stale-state already found by f1: matches expense.stale-state[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-016: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>noise-001: 2 finding(s), status scored</summary>

- `f1` **excused** → `internet.notification-message` [copy]: known baseline issue internet.notification-message: matches internet.notification-message[1]: route, role, category and selector
- `f2` **excused** → `internet.shifting-menu-typo` [copy]: known baseline issue internet.shifting-menu-typo: matches internet.shifting-menu-typo[0]: route, role, category; finding has no locator

</details>

<details><summary>noise-002: 2 finding(s), status scored</summary>

- `f1` **excused** → `internet.third-party-requests` [functional]: known baseline issue internet.third-party-requests: matches internet.third-party-requests[0]: route, role, category; locators not comparable
- `f2` **excused** → `internet.notification-message` [copy]: known baseline issue internet.notification-message: matches internet.notification-message[1]: route, role, category and selector

</details>
