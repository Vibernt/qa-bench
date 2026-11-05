# QA Bench report: claude-haiku-5.5-low claude-haiku-5-5@low (bench 0.2.0-dev)

- Run: `v2-claude-haiku-5.5-low`
- Generated: 2026-11-05T15:05:43.650Z
- Tracks: exploration, regression
- Seeds: exploration=20261107, regression=20261105
- Upstreams: expense-app, swag-labs
- Matcher: deterministic-3

## Headline

| Metric | Value |
|---|---|
| Recall | 52.9% (9/17 defects) |
| Recall (novel defects) | 46.7% (7/15 novel defects) |
| Recall (known, publicly documented) | 100.0% (2/2 known defects) |
| Recall (subtle) | 30.0% (3/10 subtle defects) |
| Recall (blatant) | 85.7% (6/7 blatant defects) |
| Severity-weighted recall | 56.9% (37/65 weight; critical 5, major 3, minor 1) |
| Natural defects found | 4.8% (4/84 verified real bugs nobody planted) |
| Precision | 81.8% |
| F1 | 64.3% |
| Severity-weighted F1 | 67.1% |
| False alarms per 100 episodes | 0.0 |
| Unmatched findings per episode | 0.33 |
| Mean time to first detection | — |
| Cost | $0.01 (per defect found: $0.00) |
| Human hours | — |
| Wall time | 1542.0 s |
| Severity agreement | 76.9% of 13 true positives that stated a severity |
| Episodes scored | 12/12 |

## By track

| Track | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| exploration | 6 | 4/8 | 50.0% | 66.7% | 57.1% | 0/3 | 0.0 | 0.67 |
| regression | 6 | 5/9 | 55.6% | 100.0% | 71.4% | 0/5 | 0.0 | 0.00 |

## By category and class

| Track | Category | Class | Defects found | Recall | Precision | Unmatched |
|---|---|---|---|---|---|---|
| exploration | a11y | deterministic | 0/0 | — | — | 0 |
| exploration | consistency | deterministic | 1/2 | 50.0% | 0.0% | 2 |
| exploration | copy | deterministic | 0/0 | — | — | 0 |
| exploration | copy | judged | 0/0 | — | — | 0 |
| exploration | error-handling | deterministic | 0/0 | — | — | 0 |
| exploration | functional | deterministic | 2/4 | 50.0% | 83.3% | 1 |
| exploration | permission | deterministic | 1/1 | 100.0% | 100.0% | 0 |
| exploration | security-hygiene | deterministic | 0/1 | 0.0% | 50.0% | 1 |
| exploration | usability | deterministic | 0/0 | — | — | 0 |
| regression | a11y | deterministic | 0/0 | — | — | 0 |
| regression | consistency | deterministic | 2/2 | 100.0% | 100.0% | 0 |
| regression | copy | deterministic | 0/0 | — | — | 0 |
| regression | copy | judged | 0/0 | — | — | 0 |
| regression | error-handling | deterministic | 1/1 | 100.0% | — | 0 |
| regression | functional | deterministic | 1/3 | 33.3% | 100.0% | 0 |
| regression | permission | deterministic | 0/1 | 0.0% | — | 0 |
| regression | security-hygiene | deterministic | 1/2 | 50.0% | 100.0% | 0 |
| regression | usability | deterministic | 0/0 | — | 100.0% | 0 |

Per category

| Category | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| a11y | 12 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| consistency | 12 | 3/4 | 75.0% | 50.0% | 60.0% | 0/0 | 0.0 | 0.17 |
| copy | 12 | 0/0 | — | — | — | 0/8 | 0.0 | 0.00 |
| error-handling | 12 | 1/1 | 100.0% | — | — | 0/0 | 0.0 | 0.00 |
| functional | 12 | 3/7 | 42.9% | 91.7% | 58.4% | 0/0 | 0.0 | 0.08 |
| permission | 12 | 1/2 | 50.0% | 100.0% | 66.7% | 0/0 | 0.0 | 0.00 |
| security-hygiene | 12 | 1/3 | 33.3% | 66.7% | 44.4% | 0/0 | 0.0 | 0.08 |
| usability | 12 | 0/0 | — | 100.0% | — | 0/0 | 0.0 | 0.00 |

Per class

| Class | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| deterministic | 12 | 9/17 | 52.9% | 81.8% | 64.3% | 0/0 | 0.0 | 0.33 |
| judged | 12 | 0/0 | — | 0.0% | — | 0/8 | 0.0 | 0.33 |

## Episodes

| Episode | Track | App | Status | Defects found | Findings | TP | Dup | Change FA | Excused | Unmatched | First detection | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| regression-003 | regression | expense-app | scored | 1/2 | 1 | 1 | 0 | 0 | 0 | 0 | — | 88.2 s |
| regression-012 | regression | expense-app | scored | 1/3 | 1 | 1 | 0 | 0 | 0 | 0 | — | 171.8 s |
| regression-019 | regression | expense-app | scored | 2/3 | 2 | 2 | 0 | 0 | 0 | 0 | — | 73.5 s |
| regression-009 | regression | expense-app | scored | 0/0 | 2 | 2 | 0 | 0 | 0 | 0 | — | 107.8 s |
| regression-016 | regression | expense-app | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 78.2 s |
| regression-011 | regression | swag-labs | scored | 1/1 | 4 | 1 | 3 | 0 | 0 | 0 | — | 152.1 s |
| exploration-001 | exploration | expense-app | scored | 1/3 | 1 | 1 | 0 | 0 | 0 | 0 | — | 89.8 s |
| exploration-004 | exploration | expense-app | scored | 1/2 | 3 | 1 | 0 | 0 | 0 | 2 | — | 77.9 s |
| exploration-008 | exploration | expense-app | scored | 1/2 | 4 | 2 | 1 | 0 | 0 | 1 | — | 88.0 s |
| exploration-010 | exploration | expense-app | scored | 0/0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 204.0 s |
| exploration-007 | exploration | swag-labs | scored | 0/0 | 2 | 1 | 0 | 0 | 0 | 1 | — | 271.4 s |
| exploration-015 | exploration | swag-labs | scored | 1/1 | 2 | 1 | 1 | 0 | 0 | 0 | — | 139.3 s |

## Findings

<details><summary>regression-003: 1 finding(s), status scored</summary>

Missed defects: `expense.edit-drops-cents`

- `f1` **true_positive** → `expense.title-not-escaped` [security-hygiene]: first finding to hit defect expense.title-not-escaped: matches expense.title-not-escaped[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-012: 1 finding(s), status scored</summary>

Missed defects: `expense.delete-open-to-viewer`, `expense.edit-resets-category`

- `f1` **true_positive** → `expense.stale-state` [consistency]: first finding to hit defect expense.stale-state: matches expense.stale-state[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-019: 2 finding(s), status scored</summary>

Missed defects: `expense.title-not-escaped`

- `f1` **true_positive** → `expense.duplicate-write` [functional]: first finding to hit defect expense.duplicate-write: matches expense.duplicate-write[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.total-under-filter` [consistency]: first finding to hit defect expense.total-under-filter: matches expense.total-under-filter[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-009: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `expense.zero-amount-accepted` [functional]: first finding to hit defect expense.zero-amount-accepted: matches expense.zero-amount-accepted[0]: route, role, category; locators not comparable
- `f2` **true_positive** → `expense.flash-in-url` [usability]: first finding to hit defect expense.flash-in-url: matches expense.flash-in-url[0]: route, role, category; locators not comparable

</details>

<details><summary>regression-016: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>regression-011: 4 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.error-user` [functional]: first finding to hit defect swag.error-user: matches swag.error-user[8]: route, role, category and selector
- `f2` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[4]: route, role, category and selector
- `f3` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[10]: route, role, category; locators not comparable
- `f4` **duplicate** → `swag.error-user` [functional]: defect swag.error-user already found by f1: matches swag.error-user[14]: route, role, category and selector

</details>

<details><summary>exploration-001: 1 finding(s), status scored</summary>

Missed defects: `expense.long-title-truncated`, `expense.title-not-escaped`

- `f1` **true_positive** → `expense.duplicate-write` [functional]: first finding to hit defect expense.duplicate-write: matches expense.duplicate-write[0]: route, role, category; finding has no locator

</details>

<details><summary>exploration-004: 3 finding(s), status scored</summary>

Missed defects: `expense.stale-state`

- `f1` **true_positive** → `expense.total-under-filter` [functional]: first finding to hit defect expense.total-under-filter: matches expense.total-under-filter[0]: route, role, category; locators not comparable
- `f2` **unmatched** [functional]: no label matched; closest: description does not mention the symptom (/stale|cach|(for|about|roughly|around|~) (about |roughly |around )?(\d+ ?(s|secs?|seconds|mins?|minutes)\b|a (while|minute|bit))|catch(es)? up|out of (sync|date)|\blater\b|eventually|delay|\blag(s|ging)?\b|after (about |roughly |around |some |a few |~)?(\d+ ?(s|secs?|seconds|mins?|minutes)\b|a (while|minute|bit))|\d+ ?(seconds|minutes)|when filtering|filtered (list|view) (already )?shows|(only|eventually) (appears?|shows?( up)?) after|appears? (only )?(later|after)|shows? up (only )?(later|after)|(edit form|record|database|saved data|stored (value|data))( for the same expense)?( already| does| still)? (shows?|holds?|has|contains) the (new|updated|saved|correct|changed)/i) for expense.stale-state
- `f3` **unmatched** [consistency]: no label matched; closest: description does not mention the symptom (/stale|cach|(for|about|roughly|around|~) (about |roughly |around )?(\d+ ?(s|secs?|seconds|mins?|minutes)\b|a (while|minute|bit))|catch(es)? up|out of (sync|date)|\blater\b|eventually|delay|\blag(s|ging)?\b|after (about |roughly |around |some |a few |~)?(\d+ ?(s|secs?|seconds|mins?|minutes)\b|a (while|minute|bit))|\d+ ?(seconds|minutes)|when filtering|filtered (list|view) (already )?shows|(only|eventually) (appears?|shows?( up)?) after|appears? (only )?(later|after)|shows? up (only )?(later|after)|(edit form|record|database|saved data|stored (value|data))( for the same expense)?( already| does| still)? (shows?|holds?|has|contains) the (new|updated|saved|correct|changed)/i) for expense.stale-state

</details>

<details><summary>exploration-008: 4 finding(s), status scored</summary>

Missed defects: `expense.edit-resets-category`

- `f1` **true_positive** → `expense.permission-bypass` [permission]: first finding to hit defect expense.permission-bypass: matches expense.permission-bypass[0]: route, role, category; locators not comparable
- `f2` **duplicate** → `expense.permission-bypass` [permission]: defect expense.permission-bypass already found by f1: matches expense.permission-bypass[0]: route, role, category; finding has no locator
- `f3` **unmatched** [consistency]: no label matched; closest: description does not mention the symptom (/^(?![\s\S]*((delet|remov)\w*.{0,80}(succe|accept|303|\b200\b|allow|works|went through|is gone|\bgone\b|disappear|vanish|really|actually|removed|no longer|permitted|not (refused|blocked|rejected|forbidden|denied|prevented)|instead of (a )?403)|(can|could|able to|allowed to|manag\w* to|permitted to|lets?)( still)?( \w+){0,3} (delet|remov)))(?=[\s\S]*\b(viewers?|read-?only|non-editors?|unprivileged|low(er)?[- ]privilege\w*)\b)(?=[\s\S]*(\bedit|updat|modif|chang|alter|/expenses/\d+\b))(?=[\s\S]*(\b200\b|303|accept|allow|succe|works|\bable\b|\bcan\b|could|lets?\b|permit|reach|not (refused|blocked|rejected|forbidden|enforced|denied)|instead of|bypass|without (a |being )?(403|refused|blocked)|gets? the (full |edit )?form|(shows?|serves?|opens?|displays?|returns?) the (full |whole |pre-?filled )?(edit )?form|(saving|submitting)( it)? (changes|updates|works|is accepted|goes through)))/i) for expense.permission-bypass
- `f4` **true_positive** → `expense.no-security-headers` [security-hygiene]: first finding to hit defect expense.no-security-headers: matches expense.no-security-headers[0]: route, role, category; finding has no locator

</details>

<details><summary>exploration-010: 0 finding(s), status scored</summary>

_No findings._

</details>

<details><summary>exploration-007: 2 finding(s), status scored</summary>

- `f1` **unmatched** [security-hygiene]: no label matched; closest: description does not mention the symptom (/content-security-policy|\bcsp\b|x-frame-options|frame-ancestors|x-content-type-options|nosniff|clickjack|(security|hardening) headers?/i) for swag.no-security-headers
- `f2` **true_positive** → `swag.reset-keeps-remove-buttons` [functional]: first finding to hit defect swag.reset-keeps-remove-buttons: matches swag.reset-keeps-remove-buttons[0]: route, role, category; locators not comparable

</details>

<details><summary>exploration-015: 2 finding(s), status scored</summary>

- `f1` **true_positive** → `swag.problem-user` [functional]: first finding to hit defect swag.problem-user: matches swag.problem-user[12]: route, role, category and selector
- `f2` **duplicate** → `swag.problem-user` [functional]: defect swag.problem-user already found by f1: matches swag.problem-user[7]: route, role, category and selector

</details>
