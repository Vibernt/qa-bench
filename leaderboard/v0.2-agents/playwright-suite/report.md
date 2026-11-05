# QA Bench report: playwright-suite 0.1.0 (bench 0.2.0-dev)

- Run: `v2-playwright-suite`
- Generated: 2026-11-05T15:11:02.117Z
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
| Recall (subtle) | 0.0% (0/10 subtle defects) |
| Recall (blatant) | 85.7% (6/7 blatant defects) |
| Severity-weighted recall | 40.0% (26/65 weight; critical 5, major 3, minor 1) |
| Natural defects found | 0.0% (0/84 verified real bugs nobody planted) |
| Precision | 65.0% |
| F1 | 45.7% |
| Severity-weighted F1 | 49.5% |
| False alarms per 100 episodes | 66.7 |
| Unmatched findings per episode | 0.33 |
| Mean time to first detection | 11.4 s |
| Cost | $0.00 (per defect found: $0.00) |
| Human hours | — |
| Wall time | 293.3 s |
| Severity agreement | — (no finding stated a severity) |
| Episodes scored | 12/12 |

## By track

| Track | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| exploration | 6 | 3/8 | 37.5% | 61.1% | 46.5% | 3/3 | 50.0 | 0.33 |
| regression | 6 | 3/9 | 33.3% | 68.2% | 44.8% | 5/5 | 83.3 | 0.33 |

## By category and class

| Track | Category | Class | Defects found | Recall | Precision | Unmatched |
|---|---|---|---|---|---|---|
| exploration | a11y | deterministic | 0/0 | — | — | 0 |
| exploration | consistency | deterministic | 1/2 | 50.0% | 75.0% | 1 |
| exploration | copy | deterministic | 0/0 | — | — | 0 |
| exploration | copy | judged | 0/0 | — | 0.0% | 0 |
| exploration | error-handling | deterministic | 0/0 | — | — | 0 |
| exploration | functional | deterministic | 1/4 | 25.0% | 85.7% | 1 |
| exploration | permission | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| exploration | security-hygiene | deterministic | 0/1 | 0.0% | — | 0 |
| exploration | usability | deterministic | 0/0 | — | — | 0 |
| regression | a11y | deterministic | 0/0 | — | — | 0 |
| regression | consistency | deterministic | 1/2 | 50.0% | 75.0% | 1 |
| regression | copy | deterministic | 0/0 | — | — | 0 |
| regression | copy | judged | 0/0 | — | 0.0% | 0 |
| regression | error-handling | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| regression | functional | deterministic | 1/3 | 33.3% | 87.5% | 1 |
| regression | permission | deterministic | 0/1 | 0.0% | — | 0 |
| regression | security-hygiene | deterministic | 0/2 | 0.0% | — | 0 |
| regression | usability | deterministic | 0/0 | — | — | 0 |

Per category

| Category | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| a11y | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| consistency | 12 | 2/4 | 50.0% | 75.0% | 60.0% | 0/0 | 0.0 | 0.17 |
| copy | 12 | 0/0 | — | 0.0% | — | 8/8 | 66.7 | 0.00 |
| error-handling | 12 | 1/1 | 100.0% | 100.0% | 100.0% | 0/0 | 0.0 | 0.00 |
| functional | 12 | 2/7 | 28.6% | 86.7% | 43.0% | 0/0 | 0.0 | 0.17 |
| permission | 12 | 1/2 | 50.0% | 100.0% | 66.7% | 0/0 | 0.0 | 0.00 |
| security-hygiene | 12 | 0/3 | 0.0% | — | — | 0/0 | 0.0 | 0.00 |
| usability | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| visual | 12 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |

Per class

| Class | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| deterministic | 12 | 6/17 | 35.3% | 86.7% | 50.2% | 0/0 | 0.0 | 0.33 |
| judged | 12 | 0/0 | — | 0.0% | — | 8/8 | 66.7 | 0.33 |

## Episodes

| Episode | Track | App | Status | Defects found | Findings | TP | Dup | Change FA | Excused | Unmatched | First detection | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| regression-003 | regression | expense-app | scored | 0/2 | 2 | 0 | 0 | 1 | 0 | 1 | — | 41.1 s |
| regression-012 | regression | expense-app | scored | 1/3 | 3 | 1 | 1 | 1 | 0 | 0 | 29.4 s | 41.8 s |
| regression-019 | regression | expense-app | scored | 1/3 | 3 | 1 | 0 | 1 | 0 | 1 | 28.2 s | 41.1 s |
| regression-009 | regression | expense-app | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 41.4 s |
| regression-016 | regression | expense-app | scored | 0/0 | 1 | 0 | 0 | 1 | 0 | 0 | — | 9.3 s |
| regression-011 | regression | swag-labs | scored | 1/1 | 13 | 1 | 11 | 1 | 0 | 0 | 2.9 s | 34.2 s |
| exploration-001 | exploration | expense-app | scored | 0/3 | 2 | 0 | 0 | 1 | 0 | 1 | — | 10.0 s |
| exploration-004 | exploration | expense-app | scored | 1/2 | 3 | 1 | 1 | 0 | 0 | 1 | 4.9 s | 9.7 s |
| exploration-008 | exploration | expense-app | scored | 1/2 | 2 | 1 | 0 | 1 | 0 | 0 | 2.4 s | 8.7 s |
| exploration-010 | exploration | expense-app | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 8.7 s |
| exploration-007 | exploration | swag-labs | scored | 0/0 | 3 | 0 | 0 | 3 | 0 | 0 | — | 19.7 s |
| exploration-015 | exploration | swag-labs | scored | 1/1 | 8 | 1 | 7 | 0 | 0 | 0 | 0.6 s | 27.6 s |

## Findings

<details><summary>regression-003: 2 finding(s), status scored</summary>

Missed defects: `expense.edit-drops-cents`, `expense.title-not-escaped`

- `pw-001-expense-add-control-label` **false_alarm_change** → `expense.relabel` [copy]: flags deliberate change expense.relabel: matches expense.relabel[3]: route, role, category and selector
- `pw-002-expense-edit-message-matches` **unmatched** [functional]: no label matched; closest: description does not mention the symptom (/^(?=[\s\S]*(\bedit|updat|re-?sav|chang\w* (an|the|its) (expense|amount)|modif))(?=[\s\S]*(cents?\b|decimal|fraction|pennies|paise|whole (number|unit|dollar|amount|euro|rupee)|integer|round(ed|s|ing)? (down|off|to)|(amount|value|price)s? (is |are |gets? |was )?(truncat|round|floor)|truncat\w* (the )?(amount|value|cents|decimal)|\bfloor|\d+\.(?!00)\d{2}\W{0,3} ?(->|→|becomes?|became|is saved as|was saved as|saved as|shows? (up )?as|turns? into|turned into|changes? to|changed to|(is |was )?stored as|ended up as|is now|to|into) \$?\d+(\.00)?\b(?!\.\d)))/i) for expense.edit-drops-cents

</details>

<details><summary>regression-012: 3 finding(s), status scored</summary>

Missed defects: `expense.delete-open-to-viewer`, `expense.edit-resets-category`

- `pw-001-expense-add-control-label` **false_alarm_change** → `expense.relabel` [copy]: flags deliberate change expense.relabel: matches expense.relabel[3]: route, role, category and selector
- `pw-002-expense-add-shows-now` **true_positive** → `expense.stale-state` [consistency]: first finding to hit defect expense.stale-state: matches expense.stale-state[0]: route, role, category; locators not comparable
- `pw-003-expense-edit-shows-now` **duplicate** → `expense.stale-state` [consistency]: defect expense.stale-state already found by pw-002-expense-add-shows-now: matches expense.stale-state[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-019: 3 finding(s), status scored</summary>

Missed defects: `expense.title-not-escaped`, `expense.total-under-filter`

- `pw-001-expense-add-control-label` **false_alarm_change** → `expense.relabel` [copy]: flags deliberate change expense.relabel: matches expense.relabel[3]: route, role, category and selector
- `pw-002-expense-add-one-row` **true_positive** → `expense.duplicate-write` [functional]: first finding to hit defect expense.duplicate-write: matches expense.duplicate-write[0]: route, role, category; locators not comparable
- `pw-003-expense-total-equals-sum` **unmatched** [consistency]: no label matched; closest: description does not mention the symptom (/escap|html|markup|mark-up|inject|xss|cross[- ]site|<\s*/?\s*(b|i|u|img|script|svg|a|em|strong|h\d|div|span|iframe)\b|onerror|alert\(|sanitiz|rendered (as|like) (bold|italic|html|markup)|\b(bold|italic)\b|raw (html|tags)|interpreted as/i) for expense.title-not-escaped

</details>

<details><summary>regression-009: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>regression-016: 1 finding(s), status scored</summary>

- `pw-001-expense-add-control-label` **false_alarm_change** → `expense.relabel` [copy]: flags deliberate change expense.relabel: matches expense.relabel[3]: route, role, category and selector

</details>

<details><summary>regression-011: 13 finding(s), status scored</summary>

- `pw-001-swag-sort` **true_positive** → `swag.error-user` [functional]: first finding to hit defect swag.error-user: matches swag.error-user[8]: route, role, category and selector
- `pw-002-page-console` **duplicate** → `swag.error-user` [error-handling]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[9]: route, role, category; finding has no locator
- `pw-003-page-pageerror` **duplicate** → `swag.error-user` [error-handling]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[9]: route, role, category; finding has no locator
- `pw-004-swag-detail-cart` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[10]: route, role, category; locators not comparable
- `pw-005-swag-detail-description` **duplicate** → `swag.error-user` [consistency]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[10]: route, role, category; locators not comparable
- `pw-006-page-pageerror` **duplicate** → `swag.error-user` [error-handling]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[0]: route, role, category; finding has no locator
- `pw-007-swag-cart-add` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[1]: route, role, category and selector
- `pw-008-swag-cart-remove` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[4]: route, role, category and selector
- `pw-009-swag-page-copy` **false_alarm_change** → `swag.relabel` [copy]: flags deliberate change swag.relabel: matches swag.relabel[4]: route, role, category and selector
- `pw-010-page-pageerror` **duplicate** → `swag.error-user` [error-handling]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[11]: route, role, category; finding has no locator
- `pw-011-swag-checkout-fields-kept` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[12]: route, role, category and selector
- `pw-012-page-pageerror` **duplicate** → `swag.error-user` [error-handling]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[13]: route, role, category; finding has no locator
- `pw-013-swag-finish` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by pw-001-swag-sort: matches swag.error-user[14]: route, role, category and selector

</details>

<details><summary>exploration-001: 2 finding(s), status scored</summary>

Missed defects: `expense.duplicate-write`, `expense.long-title-truncated`, `expense.title-not-escaped`

- `pw-001-expense-add-control-label` **false_alarm_change** → `expense.relabel` [copy]: flags deliberate change expense.relabel: matches expense.relabel[3]: route, role, category and selector
- `pw-002-expense-add-persists` **unmatched** [functional]: no label matched; closest: description does not mention the symptom (/twice|two (identical |duplicate |separate )?(rows|copies|entries|records|expenses|times|lines)|\b2 (identical )?(rows|copies|entries|records|lines)|duplicat|doubl(e|ed|es)\b|second (copy|row|entry)|by two (rows|entries)/i) for expense.duplicate-write

</details>

<details><summary>exploration-004: 3 finding(s), status scored</summary>

Missed defects: `expense.total-under-filter`

- `pw-001-expense-add-shows-now` **true_positive** → `expense.stale-state` [consistency]: first finding to hit defect expense.stale-state: matches expense.stale-state[0]: route, role, category; locators not comparable
- `pw-002-expense-edit-shows-now` **duplicate** → `expense.stale-state` [consistency]: defect expense.stale-state already found by pw-001-expense-add-shows-now: matches expense.stale-state[0]: route, role, category; locators not comparable
- `pw-003-expense-total-equals-sum` **unmatched** [consistency]: no label matched; closest: description does not mention the symptom (/^(?=[\s\S]*(filter|categor|travel|meals|office))(?=[\s\S]*\b(total|sum)\b)(?=[\s\S]*((hidden|other|unlisted|invisible|filtered[- ]out|non-?matching|every|all(?! (the )?(listed|visible|shown|displayed|of the listed)))([- ]\w+){0,2}[- ](rows?|expenses?|items?|entries|categor\w*|amounts?)|(rows?|expenses?|items?|amounts?|entries) (that are |which are )?(not (shown|listed|visible|displayed)|hidden|filtered out)|unfiltered (total|sum|amount)|instead of the (total|sum) of (the |only the )?(visible|listed|shown|displayed|filtered|matching)|(overall|grand|full|whole|entire|complete) (total|sum)|(same|identical) (total|amount|sum|figure|number|value)|same as (the |with |without )?(the )?(unfiltered|overall|full|all|grand|whole|no filter|before)|(stays|remains|is) the same|(does ?n.t|does not|never|did ?n.t|did not|won.t) (change|update|recalculate|go down|reflect the filter)|ignor\w* the (category )?filter|regardless of the filter|total.{0,40}(higher|greater|larger|too (high|large|big)|inflated|exceeds)|(includ\w*|count\w*|sums?|add\w*)( up)? (in )?(the )?(hidden|other|every|all(?! (the )?(listed|visible|shown|displayed))|filtered[- ]out|rows (that are )?not (shown|listed))))/i) for expense.total-under-filter

</details>

<details><summary>exploration-008: 2 finding(s), status scored</summary>

Missed defects: `expense.edit-resets-category`

- `pw-001-expense-viewer-endpoints-refused` **true_positive** → `expense.permission-bypass` [permission]: first finding to hit defect expense.permission-bypass: matches expense.permission-bypass[0]: route, role, category; finding has no locator
- `pw-002-expense-add-control-label` **false_alarm_change** → `expense.relabel` [copy]: flags deliberate change expense.relabel: matches expense.relabel[3]: route, role, category and selector

</details>

<details><summary>exploration-010: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>exploration-007: 3 finding(s), status scored</summary>

- `pw-001-swag-page-copy` **false_alarm_change** → `swag.checkout-copy` [copy]: flags deliberate change swag.checkout-copy: matches swag.checkout-copy[0]: route, role, category and selector
- `pw-002-swag-page-copy` **false_alarm_change** → `swag.checkout-copy` [copy]: flags deliberate change swag.checkout-copy: matches swag.checkout-copy[1]: route, role, category and selector
- `pw-003-swag-page-copy` **false_alarm_change** → `swag.checkout-copy` [copy]: flags deliberate change swag.checkout-copy: matches swag.checkout-copy[2]: route, role, category and selector

</details>

<details><summary>exploration-015: 8 finding(s), status scored</summary>

- `pw-001-swag-product-images-distinct` **true_positive** → `swag.problem-user` [visual]: first finding to hit defect swag.problem-user: matches swag.problem-user[0]: route, role, category; locators not comparable
- `pw-002-swag-sort` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by pw-001-swag-product-images-distinct: matches swag.problem-user[7]: route, role, category and selector
- `pw-003-swag-detail-matches` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by pw-001-swag-product-images-distinct: matches swag.problem-user[8]: route, role, category; locators not comparable
- `pw-004-swag-cart-add` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by pw-001-swag-product-images-distinct: matches swag.problem-user[1]: route, role, category and selector
- `pw-005-swag-cart-remove` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by pw-001-swag-product-images-distinct: matches swag.problem-user[4]: route, role, category and selector
- `pw-006-swag-checkout-fields-kept` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by pw-001-swag-product-images-distinct: matches swag.problem-user[12]: route, role, category and selector
- `pw-007-swag-overview-item-total` **duplicate** → `swag.problem-user` [consistency]: defect swag.problem-user already found by pw-001-swag-product-images-distinct: matches swag.problem-user[14]: route, role, category and selector
- `pw-008-swag-finish-empties-cart` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by pw-001-swag-product-images-distinct: matches swag.problem-user[16]: route, role, category and selector

</details>
