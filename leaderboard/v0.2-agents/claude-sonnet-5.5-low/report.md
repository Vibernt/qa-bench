# QA Bench report: claude-sonnet-5.5-low claude-sonnet-5-5@low (bench 0.2.0-dev)

- Run: `v2-claude-sonnet-5.5-low`
- Generated: 2026-11-05T15:05:44.478Z
- Tracks: exploration, regression
- Seeds: exploration=20261107, regression=20261105
- Upstreams: expense-app, swag-labs
- Matcher: deterministic-3

## Headline

| Metric | Value |
|---|---|
| Recall | 35.3% (6/17 defects) |
| Recall (novel defects) | 26.7% (4/15 novel defects) |
| Recall (known, publicly documented) | 100.0% (2/2 known defects) |
| Recall (subtle) | 20.0% (2/10 subtle defects) |
| Recall (blatant) | 57.1% (4/7 blatant defects) |
| Severity-weighted recall | 40.0% (26/65 weight; critical 5, major 3, minor 1) |
| Natural defects found | 1.2% (1/84 verified real bugs nobody planted) |
| Precision | 73.3% |
| F1 | 47.7% |
| Severity-weighted F1 | 51.8% |
| False alarms per 100 episodes | 8.3 |
| Unmatched findings per episode | 0.25 |
| Mean time to first detection | — |
| Cost | $0.19 (per defect found: $0.03) |
| Human hours | — |
| Wall time | 730.2 s |
| Severity agreement | 85.7% of 7 true positives that stated a severity |
| Episodes scored | 12/12 |

## By track

| Track | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| exploration | 6 | 3/8 | 37.5% | 100.0% | 54.5% | 0/3 | 0.0 | 0.00 |
| regression | 6 | 3/9 | 33.3% | 55.6% | 41.7% | 1/5 | 16.7 | 0.50 |

## By category and class

| Track | Category | Class | Defects found | Recall | Precision | Unmatched |
|---|---|---|---|---|---|---|
| exploration | a11y | deterministic | 0/0 | — | — | 0 |
| exploration | consistency | deterministic | 1/2 | 50.0% | — | 0 |
| exploration | copy | deterministic | 0/0 | — | — | 0 |
| exploration | copy | judged | 0/0 | — | — | 0 |
| exploration | error-handling | deterministic | 0/0 | — | 100.0% | 0 |
| exploration | functional | deterministic | 1/4 | 25.0% | 100.0% | 0 |
| exploration | permission | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| exploration | security-hygiene | deterministic | 0/1 | 0.0% | — | 0 |
| exploration | usability | deterministic | 0/0 | — | — | 0 |
| regression | a11y | deterministic | 0/0 | — | — | 0 |
| regression | consistency | deterministic | 1/2 | 50.0% | 100.0% | 0 |
| regression | copy | deterministic | 0/0 | — | — | 0 |
| regression | copy | judged | 0/0 | — | 0.0% | 0 |
| regression | error-handling | deterministic | 1/1 | 100.0% | — | 0 |
| regression | functional | deterministic | 1/3 | 33.3% | 57.1% | 3 |
| regression | permission | deterministic | 0/1 | 0.0% | — | 0 |
| regression | security-hygiene | deterministic | 0/2 | 0.0% | — | 0 |
| regression | usability | deterministic | 0/0 | — | — | 0 |

Per category

| Category | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| a11y | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| consistency | 12 | 2/4 | 50.0% | 100.0% | 66.7% | 0/0 | 0.0 | 0.00 |
| copy | 12 | 0/0 | — | 0.0% | — | 1/8 | 8.3 | 0.00 |
| error-handling | 12 | 1/1 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| functional | 12 | 2/7 | 28.6% | 70.0% | 40.6% | 0/0 | 0.0 | 0.25 |
| permission | 12 | 1/2 | 50.0% | 100.0% | 66.7% | 0/0 | 0.0 | 0.00 |
| security-hygiene | 12 | 0/3 | 0.0% | — | — | 0/0 | 0.0 | 0.00 |
| usability | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |

Per class

| Class | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| deterministic | 12 | 6/17 | 35.3% | 78.6% | 48.7% | 0/0 | 0.0 | 0.25 |
| judged | 12 | 0/0 | — | 0.0% | — | 1/8 | 8.3 | 0.25 |

## Episodes

| Episode | Track | App | Status | Defects found | Findings | TP | Dup | Change FA | Excused | Unmatched | First detection | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| regression-003 | regression | expense-app | scored | 0/2 | 0 | 0 | 0 | 0 | 0 | 0 | — | 38.5 s |
| regression-012 | regression | expense-app | scored | 0/3 | 2 | 0 | 0 | 0 | 0 | 2 | — | 212.8 s |
| regression-019 | regression | expense-app | scored | 2/3 | 2 | 2 | 0 | 0 | 0 | 0 | — | 25.5 s |
| regression-009 | regression | expense-app | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 72.0 s |
| regression-016 | regression | expense-app | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 29.5 s |
| regression-011 | regression | swag-labs | scored | 1/1 | 5 | 1 | 2 | 1 | 0 | 1 | — | 89.3 s |
| exploration-001 | exploration | expense-app | scored | 0/3 | 1 | 1 | 0 | 0 | 0 | 0 | — | 34.0 s |
| exploration-004 | exploration | expense-app | scored | 1/2 | 1 | 1 | 0 | 0 | 0 | 0 | — | 28.7 s |
| exploration-008 | exploration | expense-app | scored | 1/2 | 2 | 1 | 1 | 0 | 0 | 0 | — | 49.5 s |
| exploration-010 | exploration | expense-app | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 55.1 s |
| exploration-007 | exploration | swag-labs | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 20.8 s |
| exploration-015 | exploration | swag-labs | scored | 1/1 | 2 | 1 | 1 | 0 | 0 | 0 | — | 74.5 s |

## Findings

<details><summary>regression-003: 0 finding(s), status scored</summary>

Missed defects: `expense.edit-drops-cents`, `expense.title-not-escaped`

_No findings._

</details>

<details><summary>regression-012: 2 finding(s), status scored</summary>

Missed defects: `expense.delete-open-to-viewer`, `expense.edit-resets-category`, `expense.stale-state`

- `f1` **unmatched** [functional]: no label matched; closest: description does not mention the symptom (/^(?=[\s\S]*categor)(?=[\s\S]*(\bedit|re-?sav|updat\w* (an|the|a|its) (expense|amount|title)))(?=[\s\S]*(reset|revert|defaults? to|default (option|value|category)|by default|first (option|category|entry|value)|not (pre-?)?selected|is ?n.t (pre-?)?selected|unselected|nothing (is )?selected|no (option|category) (is )?(pre-?)?selected|blank|wrong categor|silently chang|chang\w* (it )?(silently|by itself|on its own|unexpectedly)|without (touching|changing|selecting)|(becomes?|became|changed? to|switch\w* to|set to|saved as|now|turns? into|flips? to|jumps? to)( \w+){0,2} .?travel|(select|dropdown|drop-down|field|menu)( \w+){0,3} (shows?|displays?|has|is (set to|on)) .?travel|chang\w* (its|the) categor|\blost\b|loses|not (kept|preserved|retained)|does ?n.t (keep|preserve|retain|remember|show)))/i) for expense.edit-resets-category
- `f2` **unmatched** [functional]: no label matched; closest: description does not mention the symptom (/^(?=[\s\S]*categor)(?=[\s\S]*(\bedit|re-?sav|updat\w* (an|the|a|its) (expense|amount|title)))(?=[\s\S]*(reset|revert|defaults? to|default (option|value|category)|by default|first (option|category|entry|value)|not (pre-?)?selected|is ?n.t (pre-?)?selected|unselected|nothing (is )?selected|no (option|category) (is )?(pre-?)?selected|blank|wrong categor|silently chang|chang\w* (it )?(silently|by itself|on its own|unexpectedly)|without (touching|changing|selecting)|(becomes?|became|changed? to|switch\w* to|set to|saved as|now|turns? into|flips? to|jumps? to)( \w+){0,2} .?travel|(select|dropdown|drop-down|field|menu)( \w+){0,3} (shows?|displays?|has|is (set to|on)) .?travel|chang\w* (its|the) categor|\blost\b|loses|not (kept|preserved|retained)|does ?n.t (keep|preserve|retain|remember|show)))/i) for expense.edit-resets-category

</details>

<details><summary>regression-019: 2 finding(s), status scored</summary>

Missed defects: `expense.title-not-escaped`

- `f1` **true_positive** → `expense.duplicate-write` [functional]: first finding to hit defect expense.duplicate-write: matches expense.duplicate-write[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.total-under-filter` [consistency]: first finding to hit defect expense.total-under-filter: matches expense.total-under-filter[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-009: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>regression-016: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>regression-011: 5 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.error-user` [functional]: first finding to hit defect swag.error-user: matches swag.error-user[0]: route, role, category; locators not comparable
- `f2` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[1]: route, role, category; finding has no locator
- `f3` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[10]: route, role, category; finding has no locator
- `f4` **false_alarm_change** → `swag.relabel` [copy]: flags deliberate change swag.relabel: matches swag.relabel[0]: route, role, category; finding has no locator
- `f5` **unmatched** [functional]: no label matched; closest: description does not mention the symptom (/^(?![\s\S]*(inventory-item|item page|product page|id=\d|unknown (product|item)))(?=[\s\S]*((unknown|non-?existent|invalid|bad|missing|wrong|random|mistyped|undefined) (url|path|route|page|address)s?|/nonexistent|/no-such|\b404\b))(?=[\s\S]*(blank|empty|white|nothing|no (404|error|message|content|navigation)))/i) for swag.blank-not-found-page

</details>

<details><summary>exploration-001: 1 finding(s), status scored</summary>

Missed defects: `expense.duplicate-write`, `expense.long-title-truncated`, `expense.title-not-escaped`

- `f1` **true_positive** → `expense.rejected-form-loses-input` [error-handling]: first finding to hit defect expense.rejected-form-loses-input: matches expense.rejected-form-loses-input[0]: route, role, category; finding has no locator

</details>

<details><summary>exploration-004: 1 finding(s), status scored</summary>

Missed defects: `expense.stale-state`

- `f1` **true_positive** → `expense.total-under-filter` [functional]: first finding to hit defect expense.total-under-filter: matches expense.total-under-filter[0]: route, role, category; locators not comparable

</details>

<details><summary>exploration-008: 2 finding(s), status scored</summary>

Missed defects: `expense.edit-resets-category`

- `f1` **true_positive** → `expense.permission-bypass` [permission]: first finding to hit defect expense.permission-bypass: matches expense.permission-bypass[0]: route, role, category; finding has no locator
- `f2` **duplicate** → `expense.permission-bypass` [permission]: defect expense.permission-bypass already found by f1: matches expense.permission-bypass[0]: route, role, category; finding has no locator

</details>

<details><summary>exploration-010: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>exploration-007: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>exploration-015: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.problem-user` [functional]: first finding to hit defect swag.problem-user: matches swag.problem-user[12]: route, role, category and selector
- `f2` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[1]: route, role, category; finding has no locator

</details>
