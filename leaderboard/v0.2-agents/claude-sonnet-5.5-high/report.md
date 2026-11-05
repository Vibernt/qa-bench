# QA Bench report: claude-sonnet-5.5-high claude-sonnet-5-5@high (bench 0.2.0-dev)

- Run: `v2-claude-sonnet-5.5-high`
- Generated: 2026-11-05T15:05:46.058Z
- Tracks: exploration, regression
- Seeds: exploration=20261107, regression=20261105
- Upstreams: expense-app, swag-labs
- Matcher: deterministic-3

## Headline

| Metric | Value |
|---|---|
| Recall | 88.2% (15/17 defects) |
| Recall (novel defects) | 86.7% (13/15 novel defects) |
| Recall (known, publicly documented) | 100.0% (2/2 known defects) |
| Recall (subtle) | 80.0% (8/10 subtle defects) |
| Recall (blatant) | 100.0% (7/7 blatant defects) |
| Severity-weighted recall | 90.8% (59/65 weight; critical 5, major 3, minor 1) |
| Natural defects found | 17.9% (15/84 verified real bugs nobody planted) |
| Precision | 95.5% |
| F1 | 91.7% |
| Severity-weighted F1 | 93.1% |
| False alarms per 100 episodes | 0.0 |
| Unmatched findings per episode | 0.17 |
| Mean time to first detection | — |
| Cost | $0.35 (per defect found: $0.02) |
| Human hours | — |
| Wall time | 1884.1 s |
| Severity agreement | 76.7% of 30 true positives that stated a severity |
| Episodes scored | 12/12 |

## By track

| Track | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| exploration | 6 | 8/8 | 100.0% | 93.1% | 96.4% | 0/3 | 0.0 | 0.33 |
| regression | 6 | 7/9 | 77.8% | 100.0% | 87.5% | 0/5 | 0.0 | 0.00 |

## By category and class

| Track | Category | Class | Defects found | Recall | Precision | Unmatched |
|---|---|---|---|---|---|---|
| exploration | a11y | deterministic | 0/0 | — | — | 0 |
| exploration | consistency | deterministic | 2/2 | 100.0% | 100.0% | 0 |
| exploration | copy | deterministic | 0/0 | — | 0.0% | 1 |
| exploration | copy | judged | 0/0 | — | 0.0% | 1 |
| exploration | error-handling | deterministic | 0/0 | — | 87.5% | 1 |
| exploration | functional | deterministic | 4/4 | 100.0% | 100.0% | 0 |
| exploration | permission | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| exploration | security-hygiene | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| exploration | usability | deterministic | 0/0 | — | 100.0% | 0 |
| regression | a11y | deterministic | 0/0 | — | — | 0 |
| regression | consistency | deterministic | 2/2 | 100.0% | 100.0% | 0 |
| regression | copy | deterministic | 0/0 | — | — | 0 |
| regression | copy | judged | 0/0 | — | — | 0 |
| regression | error-handling | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| regression | functional | deterministic | 3/3 | 100.0% | 100.0% | 0 |
| regression | permission | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| regression | security-hygiene | deterministic | 0/2 | 0.0% | — | 0 |
| regression | usability | deterministic | 0/0 | — | — | 0 |

Per category

| Category | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| a11y | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| consistency | 12 | 4/4 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| copy | 12 | 0/0 | — | 0.0% | — | 0/8 | 0.0 | 0.08 |
| error-handling | 12 | 1/1 | 100.0% | 90.9% | 95.2% | 0/0 | 0.0 | 0.08 |
| functional | 12 | 7/7 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| permission | 12 | 2/2 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| security-hygiene | 12 | 1/3 | 33.3% | 100.0% | 50.0% | 0/0 | 0.0 | 0.00 |
| usability | 12 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |
| visual | 12 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |

Per class

| Class | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| deterministic | 12 | 15/17 | 88.2% | 95.5% | 91.7% | 0/0 | 0.0 | 0.17 |
| judged | 12 | 0/0 | — | 0.0% | — | 0/8 | 0.0 | 0.17 |

## Episodes

| Episode | Track | App | Status | Defects found | Findings | TP | Dup | Change FA | Excused | Unmatched | First detection | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| regression-003 | regression | expense-app | scored | 1/2 | 1 | 1 | 0 | 0 | 0 | 0 | — | 63.0 s |
| regression-012 | regression | expense-app | scored | 3/3 | 4 | 4 | 0 | 0 | 0 | 0 | — | 241.7 s |
| regression-019 | regression | expense-app | scored | 2/3 | 2 | 2 | 0 | 0 | 0 | 0 | — | 55.8 s |
| regression-009 | regression | expense-app | scored | 0/0 | 1 | 1 | 0 | 0 | 0 | 0 | — | 100.3 s |
| regression-016 | regression | expense-app | scored | 0/0 | 1 | 1 | 0 | 0 | 0 | 0 | — | 98.0 s |
| regression-011 | regression | swag-labs | scored | 1/1 | 6 | 1 | 5 | 0 | 0 | 0 | — | 268.4 s |
| exploration-001 | exploration | expense-app | scored | 3/3 | 6 | 5 | 0 | 0 | 0 | 1 | — | 72.2 s |
| exploration-004 | exploration | expense-app | scored | 2/2 | 5 | 5 | 0 | 0 | 0 | 0 | — | 111.0 s |
| exploration-008 | exploration | expense-app | scored | 2/2 | 4 | 2 | 2 | 0 | 0 | 0 | — | 70.0 s |
| exploration-010 | exploration | expense-app | scored | 0/0 | 3 | 3 | 0 | 0 | 0 | 0 | — | 89.5 s |
| exploration-007 | exploration | swag-labs | scored | 0/0 | 5 | 4 | 0 | 0 | 0 | 1 | — | 327.6 s |
| exploration-015 | exploration | swag-labs | scored | 1/1 | 6 | 1 | 5 | 0 | 0 | 0 | — | 386.6 s |

## Findings

<details><summary>regression-003: 1 finding(s), status scored</summary>

Missed defects: `expense.title-not-escaped`

- `f1` **true_positive** → `expense.edit-drops-cents` [functional]: first finding to hit defect expense.edit-drops-cents: matches expense.edit-drops-cents[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-012: 4 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.delete-open-to-viewer` [permission]: first finding to hit defect expense.delete-open-to-viewer: matches expense.delete-open-to-viewer[0]: route, role, category; finding has no locator
- `f2` **true_positive** → `expense.stale-state` [functional]: first finding to hit defect expense.stale-state: matches expense.stale-state[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.edit-resets-category` [functional]: first finding to hit defect expense.edit-resets-category: matches expense.edit-resets-category[0]: route, role, category; locators not comparable
- `f4` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-019: 2 finding(s), status scored</summary>

Missed defects: `expense.title-not-escaped`

- `f1` **true_positive** → `expense.duplicate-write` [functional]: first finding to hit defect expense.duplicate-write: matches expense.duplicate-write[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.total-under-filter` [consistency]: first finding to hit defect expense.total-under-filter: matches expense.total-under-filter[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-009: 1 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-016: 1 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-011: 6 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.error-user` [functional]: first finding to hit defect swag.error-user: matches swag.error-user[8]: route, role, category and selector
- `f2` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[0]: route, role, category; locators not comparable
- `f3` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[10]: route, role, category; locators not comparable
- `f4` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[10]: route, role, category; finding has no locator
- `f5` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[12]: route, role, category and selector
- `f6` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[14]: route, role, category and selector

</details>

<details><summary>exploration-001: 6 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.duplicate-write` [functional]: first finding to hit defect expense.duplicate-write: matches expense.duplicate-write[0]: route, role, category; finding has no locator
- `f2` **true_positive** → `expense.long-title-truncated` [functional]: first finding to hit defect expense.long-title-truncated: matches expense.long-title-truncated[0]: route, role, category; finding has no locator
- `f3` **true_positive** → `expense.title-not-escaped` [security-hygiene]: first finding to hit defect expense.title-not-escaped: matches expense.title-not-escaped[0]: route, role, category; locators not comparable
- `f4` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; finding has no locator
- `f5` **true_positive** → `expense.delete-missing-id` [usability]: first finding to hit defect expense.delete-missing-id: matches expense.delete-missing-id[0]: route, role, category; locators not comparable
- `f6` **unmatched** [copy]: no label matched; closest: description does not mention the symptom (/escap|html|markup|mark-up|inject|xss|cross[- ]site|<\s*/?\s*(b|i|u|img|script|svg|a|em|strong|h\d|div|span|iframe)\b|onerror|alert\(|sanitiz|rendered (as|like) (bold|italic|html|markup)|\b(bold|italic)\b|raw (html|tags)|interpreted as/i) for expense.title-not-escaped

</details>

<details><summary>exploration-004: 5 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.stale-state` [functional]: first finding to hit defect expense.stale-state: matches expense.stale-state[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.total-under-filter` [consistency]: first finding to hit defect expense.total-under-filter: matches expense.total-under-filter[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; finding has no locator
- `f4` **true_positive** → `expense.huge-amount-breaks-list` [error-handling]: first finding to hit defect expense.huge-amount-breaks-list: matches expense.huge-amount-breaks-list[0]: route, role, category; finding has no locator
- `f5` **true_positive** → `expense.delete-missing-id` [error-handling]: first finding to hit defect expense.delete-missing-id: matches expense.delete-missing-id[0]: route, role, category; finding has no locator

</details>

<details><summary>exploration-008: 4 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.permission-bypass` [permission]: first finding to hit defect expense.permission-bypass: matches expense.permission-bypass[0]: route, role, category; finding has no locator
- `f2` **duplicate** → `expense.permission-bypass` [permission]: defect expense.permission-bypass already found by f1: matches expense.permission-bypass[0]: route, role, category; finding has no locator
- `f3` **true_positive** → `expense.edit-resets-category` [functional]: first finding to hit defect expense.edit-resets-category: matches expense.edit-resets-category[0]: route, role, category; locators not comparable
- `f4` **duplicate** → `expense.edit-resets-category` [error-handling]: defect expense.edit-resets-category already found by f3: matches expense.edit-resets-category[0]: route, role, category; locators not comparable

</details>

<details><summary>exploration-010: 3 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.delete-missing-id` [usability]: first finding to hit defect expense.delete-missing-id: matches expense.delete-missing-id[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.huge-amount-breaks-list` [functional]: first finding to hit defect expense.huge-amount-breaks-list: matches expense.huge-amount-breaks-list[1]: route, role, category; locators not comparable

</details>

<details><summary>exploration-007: 5 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.unrounded-item-total` [functional]: first finding to hit defect swag.unrounded-item-total: matches swag.unrounded-item-total[0]: route, role, category and selector
- `f2` **true_positive** → `swag.reset-keeps-remove-buttons` [functional]: first finding to hit defect swag.reset-keeps-remove-buttons: matches swag.reset-keeps-remove-buttons[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `swag.empty-cart-checkout` [functional]: first finding to hit defect swag.empty-cart-checkout: matches swag.empty-cart-checkout[0]: route, role, category; locators not comparable
- `f4` **unmatched** [error-handling]: no label matched; closest: description does not mention the symptom (/^(?![\s\S]*(inventory-item|item page|product page|id=\d|unknown (product|item)))(?=[\s\S]*((unknown|non-?existent|invalid|bad|missing|wrong|random|mistyped|undefined) (url|path|route|page|address)s?|/nonexistent|/no-such|\b404\b))(?=[\s\S]*(blank|empty|white|nothing|no (404|error|message|content|navigation)))/i) for swag.blank-not-found-page
- `f5` **true_positive** → `swag.blank-not-found-page` [error-handling]: first finding to hit defect swag.blank-not-found-page: matches swag.blank-not-found-page[0]: route, role, category; finding has no locator

</details>

<details><summary>exploration-015: 6 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.problem-user` [functional]: first finding to hit defect swag.problem-user: matches swag.problem-user[12]: route, role, category and selector
- `f2` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[7]: route, role, category and selector
- `f3` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[1]: route, role, category and selector
- `f4` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[4]: route, role, category and selector
- `f5` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[17]: route, role, category and selector
- `f6` **duplicate** → `swag.problem-user` [visual]: defect swag.problem-user already found by f1: matches swag.problem-user[0]: route, role, category; locators not comparable

</details>
