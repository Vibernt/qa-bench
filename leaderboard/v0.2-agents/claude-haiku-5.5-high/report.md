# QA Bench report: claude-haiku-5.5-high claude-haiku-5-5@high (bench 0.2.0-dev)

- Run: `v2-claude-haiku-5.5-high`
- Generated: 2026-11-05T15:05:45.272Z
- Tracks: exploration, regression
- Seeds: exploration=20261107, regression=20261105
- Upstreams: expense-app, swag-labs
- Matcher: deterministic-3

## Headline

| Metric | Value |
|---|---|
| Recall | 100.0% (17/17 defects) |
| Recall (novel defects) | 100.0% (15/15 novel defects) |
| Recall (known, publicly documented) | 100.0% (2/2 known defects) |
| Recall (subtle) | 100.0% (10/10 subtle defects) |
| Recall (blatant) | 100.0% (7/7 blatant defects) |
| Severity-weighted recall | 100.0% (65/65 weight; critical 5, major 3, minor 1) |
| Natural defects found | 16.7% (14/84 verified real bugs nobody planted) |
| Precision | 92.7% |
| F1 | 96.2% |
| Severity-weighted F1 | 96.2% |
| False alarms per 100 episodes | 0.0 |
| Unmatched findings per episode | 0.25 |
| Mean time to first detection | — |
| Cost | $0.03 (per defect found: $0.00) |
| Human hours | — |
| Wall time | 3383.8 s |
| Severity agreement | 74.2% of 31 true positives that stated a severity |
| Episodes scored | 12/12 |

## By track

| Track | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| exploration | 6 | 8/8 | 100.0% | 86.4% | 92.7% | 0/3 | 0.0 | 0.50 |
| regression | 6 | 9/9 | 100.0% | 100.0% | 100.0% | 0/5 | 0.0 | 0.00 |

## By category and class

| Track | Category | Class | Defects found | Recall | Precision | Unmatched |
|---|---|---|---|---|---|---|
| exploration | a11y | deterministic | 0/0 | — | — | 0 |
| exploration | consistency | deterministic | 2/2 | 100.0% | 100.0% | 0 |
| exploration | copy | deterministic | 0/0 | — | — | 0 |
| exploration | copy | judged | 0/0 | — | — | 0 |
| exploration | error-handling | deterministic | 0/0 | — | 100.0% | 0 |
| exploration | functional | deterministic | 4/4 | 100.0% | 100.0% | 0 |
| exploration | permission | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| exploration | security-hygiene | deterministic | 1/1 | 100.0% | 60.0% | 2 |
| exploration | usability | deterministic | 0/0 | — | — | 0 |
| regression | a11y | deterministic | 0/0 | — | — | 0 |
| regression | consistency | deterministic | 2/2 | 100.0% | 100.0% | 0 |
| regression | copy | deterministic | 0/0 | — | — | 0 |
| regression | copy | judged | 0/0 | — | — | 0 |
| regression | error-handling | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| regression | functional | deterministic | 3/3 | 100.0% | 100.0% | 0 |
| regression | permission | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| regression | security-hygiene | deterministic | 2/2 | 100.0% | 100.0% | 0 |
| regression | usability | deterministic | 0/0 | — | 100.0% | 0 |

Per category

| Category | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| a11y | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| consistency | 12 | 4/4 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| copy | 12 | 0/0 | — | — | — | 0/8 | 0.0 | 0.00 |
| error-handling | 12 | 1/1 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| functional | 12 | 7/7 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| permission | 12 | 2/2 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| security-hygiene | 12 | 3/3 | 100.0% | 75.0% | 85.7% | 0/0 | 0.0 | 0.17 |
| usability | 12 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |
| visual | 12 | 0/0 | — | 50.0% | — | 0/0 | 0.0 | 0.08 |

Per class

| Class | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| deterministic | 12 | 17/17 | 100.0% | 92.7% | 96.2% | 0/0 | 0.0 | 0.25 |
| judged | 12 | 0/0 | — | 0.0% | — | 0/8 | 0.0 | 0.25 |

## Episodes

| Episode | Track | App | Status | Defects found | Findings | TP | Dup | Change FA | Excused | Unmatched | First detection | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| regression-003 | regression | expense-app | scored | 2/2 | 3 | 3 | 0 | 0 | 0 | 0 | — | 152.2 s |
| regression-012 | regression | expense-app | scored | 3/3 | 3 | 3 | 0 | 0 | 0 | 0 | — | 358.7 s |
| regression-019 | regression | expense-app | scored | 3/3 | 3 | 3 | 0 | 0 | 0 | 0 | — | 150.1 s |
| regression-009 | regression | expense-app | scored | 0/0 | 3 | 3 | 0 | 0 | 0 | 0 | — | 203.5 s |
| regression-016 | regression | expense-app | scored | 0/0 | 2 | 2 | 0 | 0 | 0 | 0 | — | 212.2 s |
| regression-011 | regression | swag-labs | scored | 1/1 | 5 | 1 | 4 | 0 | 0 | 0 | — | 376.0 s |
| exploration-001 | exploration | expense-app | scored | 3/3 | 3 | 3 | 0 | 0 | 0 | 0 | — | 289.0 s |
| exploration-004 | exploration | expense-app | scored | 2/2 | 3 | 3 | 0 | 0 | 0 | 0 | — | 449.6 s |
| exploration-008 | exploration | expense-app | scored | 2/2 | 4 | 4 | 0 | 0 | 0 | 0 | — | 189.2 s |
| exploration-010 | exploration | expense-app | scored | 0/0 | 4 | 4 | 0 | 0 | 0 | 0 | — | 283.9 s |
| exploration-007 | exploration | swag-labs | scored | 0/0 | 3 | 1 | 0 | 0 | 0 | 2 | — | 530.5 s |
| exploration-015 | exploration | swag-labs | scored | 1/1 | 5 | 1 | 3 | 0 | 0 | 1 | — | 188.9 s |

## Findings

<details><summary>regression-003: 3 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.title-not-escaped` [security-hygiene]: first finding to hit defect expense.title-not-escaped: matches expense.title-not-escaped[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.edit-drops-cents` [functional]: first finding to hit defect expense.edit-drops-cents: matches expense.edit-drops-cents[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-012: 3 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.delete-open-to-viewer` [permission]: first finding to hit defect expense.delete-open-to-viewer: matches expense.delete-open-to-viewer[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.stale-state` [functional]: first finding to hit defect expense.stale-state: matches expense.stale-state[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.edit-resets-category` [functional]: first finding to hit defect expense.edit-resets-category: matches expense.edit-resets-category[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-019: 3 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.duplicate-write` [functional]: first finding to hit defect expense.duplicate-write: matches expense.duplicate-write[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.title-not-escaped` [security-hygiene]: first finding to hit defect expense.title-not-escaped: matches expense.title-not-escaped[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.total-under-filter` [functional]: first finding to hit defect expense.total-under-filter: matches expense.total-under-filter[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-009: 3 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.no-security-headers` [security-hygiene]: first finding to hit defect expense.no-security-headers: matches expense.no-security-headers[0]: route, role, category; finding has no locator
- `f3` **true_positive** → `expense.silent-delete` [usability]: first finding to hit defect expense.silent-delete: matches expense.silent-delete[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-016: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; finding has no locator
- `f2` **true_positive** → `expense.silent-delete` [consistency]: first finding to hit defect expense.silent-delete: matches expense.silent-delete[0]: route, role, category; finding has no locator

</details>

<details><summary>regression-011: 5 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.error-user` [functional]: first finding to hit defect swag.error-user: matches swag.error-user[4]: route, role, category and selector
- `f2` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[10]: route, role, category; locators not comparable
- `f3` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[8]: route, role, category and selector
- `f4` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[2]: route, role, category and selector
- `f5` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[14]: route, role, category and selector

</details>

<details><summary>exploration-001: 3 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.duplicate-write` [functional]: first finding to hit defect expense.duplicate-write: matches expense.duplicate-write[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.title-not-escaped` [security-hygiene]: first finding to hit defect expense.title-not-escaped: matches expense.title-not-escaped[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.long-title-truncated` [functional]: first finding to hit defect expense.long-title-truncated: matches expense.long-title-truncated[0]: route, role, category; locators not comparable

</details>

<details><summary>exploration-004: 3 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.stale-state` [consistency]: first finding to hit defect expense.stale-state: matches expense.stale-state[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.total-under-filter` [functional]: first finding to hit defect expense.total-under-filter: matches expense.total-under-filter[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; locators not comparable

</details>

<details><summary>exploration-008: 4 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.permission-bypass` [permission]: first finding to hit defect expense.permission-bypass: matches expense.permission-bypass[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.edit-resets-category` [functional]: first finding to hit defect expense.edit-resets-category: matches expense.edit-resets-category[0]: route, role, category; locators not comparable
- `f3` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; locators not comparable
- `f4` **true_positive** → `expense.silent-delete` [consistency]: first finding to hit defect expense.silent-delete: matches expense.silent-delete[0]: route, role, category; locators not comparable

</details>

<details><summary>exploration-010: 4 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.huge-amount-breaks-list` [functional]: first finding to hit defect expense.huge-amount-breaks-list: matches expense.huge-amount-breaks-list[0]: route, role, category; finding has no locator
- `f2` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; finding has no locator
- `f3` **true_positive** → `expense.silent-delete` [consistency]: first finding to hit defect expense.silent-delete: matches expense.silent-delete[0]: route, role, category; finding has no locator
- `f4` **true_positive** → `expense.no-security-headers` [security-hygiene]: first finding to hit defect expense.no-security-headers: matches expense.no-security-headers[0]: route, role, category; finding has no locator

</details>

<details><summary>exploration-007: 3 finding(s), status scored</summary>

- `f1` **unmatched** [security-hygiene]: no label matched; closest: description does not mention the symptom (/content-security-policy|\bcsp\b|x-frame-options|frame-ancestors|x-content-type-options|nosniff|clickjack|(security|hardening) headers?/i) for swag.no-security-headers
- `f2` **true_positive** → `swag.no-security-headers` [security-hygiene]: first finding to hit defect swag.no-security-headers: matches swag.no-security-headers[0]: route, role, category; finding has no locator
- `f3` **unmatched** [visual]: no label matched; closest: description does not mention the symptom (/^(?![\s\S]*(inventory-item|item page|product page|id=\d|unknown (product|item)))(?=[\s\S]*((unknown|non-?existent|invalid|bad|missing|wrong|random|mistyped|undefined) (url|path|route|page|address)s?|/nonexistent|/no-such|\b404\b))(?=[\s\S]*(blank|empty|white|nothing|no (404|error|message|content|navigation)))/i) for swag.blank-not-found-page

</details>

<details><summary>exploration-015: 5 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.problem-user` [functional]: first finding to hit defect swag.problem-user: matches swag.problem-user[12]: route, role, category and selector
- `f2` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[7]: route, role, category and selector
- `f3` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[8]: route, role, category; locators not comparable
- `f4` **duplicate** → `swag.problem-user` [visual]: defect swag.problem-user already found by f1: matches swag.problem-user[0]: route, role, category; locators not comparable
- `f5` **unmatched** [security-hygiene]: no label matched; closest: description does not mention the symptom (/content-security-policy|\bcsp\b|x-frame-options|frame-ancestors|x-content-type-options|nosniff|clickjack|(security|hardening) headers?/i) for swag.no-security-headers

</details>
