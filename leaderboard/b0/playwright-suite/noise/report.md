# QA Bench report: playwright-suite 0.1.0 (bench 0.1.0-b0)

- Run: `b0-playwright-noise`
- Generated: 2026-11-05T05:12:28.231Z
- Tracks: noise
- Seeds: noise=20261106
- Upstreams: the-internet
- Matcher: deterministic-2

## Headline

| Metric | Value |
|---|---|
| Recall | — (0/0 defects) |
| Severity-weighted recall | — (0/0 weight; critical 5, major 3, minor 1) |
| Precision | — |
| F1 | — |
| Severity-weighted F1 | — |
| False alarms per 100 episodes | 0.0 |
| Unmatched findings per episode | 0.00 |
| Mean time to first detection | — |
| Cost | $0.00 (per defect found: —) |
| Human hours | — |
| Wall time | 120.8 s |
| Severity agreement | — (no finding stated a severity) |
| Episodes scored | 6/6 |

## By track

| Track | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| noise | 6 | 0/0 | — | — | — | 0/2 | 0.0 | 0.00 |

## By category and class

| Track | Category | Class | Defects found | Recall | Precision | Unmatched |
|---|---|---|---|---|---|---|
| noise | copy | judged | 0/0 | — | — | 0 |
| noise | error-handling | deterministic | 0/0 | — | — | 0 |
| noise | functional | deterministic | 0/0 | — | — | 0 |
| noise | perf | deterministic | 0/0 | — | — | 0 |
| noise | visual | deterministic | 0/0 | — | — | 0 |
| noise | visual | judged | 0/0 | — | — | 0 |

Per category

| Category | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| copy | 6 | 0/0 | — | — | — | 0/2 | 0.0 | 0.00 |
| error-handling | 6 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| functional | 6 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| perf | 6 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| visual | 6 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |

Per class

| Class | Episodes | Defects found | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep |
|---|---|---|---|---|---|---|---|---|
| deterministic | 6 | 0/0 | — | — | — | 0/0 | 0.0 | 0.00 |
| judged | 6 | 0/0 | — | — | — | 0/2 | 0.0 | 0.00 |

## Episodes

| Episode | Track | App | Status | Defects found | Findings | TP | Dup | Change FA | Excused | Unmatched | First detection | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| noise-001 | noise | the-internet | scored | 0/0 | 2 | 0 | 0 | 0 | 2 | 0 | — | 21.1 s |
| noise-002 | noise | the-internet | scored | 0/0 | 2 | 0 | 0 | 0 | 2 | 0 | — | 20.9 s |
| noise-003 | noise | the-internet | scored | 0/0 | 2 | 0 | 0 | 0 | 2 | 0 | — | 21.1 s |
| noise-004 | noise | the-internet | scored | 0/0 | 2 | 0 | 0 | 0 | 2 | 0 | — | 19.3 s |
| noise-005 | noise | the-internet | scored | 0/0 | 2 | 0 | 0 | 0 | 2 | 0 | — | 19.1 s |
| noise-006 | noise | the-internet | scored | 0/0 | 2 | 0 | 0 | 0 | 2 | 0 | — | 19.2 s |

## Findings

<details><summary>noise-001: 2 finding(s), status scored</summary>

- `pw-001-page-broken-image` **excused** → `internet.broken-images` [visual]: known baseline issue internet.broken-images: matches internet.broken-images[0]: route, role, category and selector
- `pw-002-page-pageerror` **excused** → `internet.javascript-error` [error-handling]: known baseline issue internet.javascript-error: matches internet.javascript-error[0]: route, role, category; finding has no locator

</details>

<details><summary>noise-002: 2 finding(s), status scored</summary>

- `pw-001-page-broken-image` **excused** → `internet.broken-images` [visual]: known baseline issue internet.broken-images: matches internet.broken-images[0]: route, role, category and selector
- `pw-002-page-pageerror` **excused** → `internet.javascript-error` [error-handling]: known baseline issue internet.javascript-error: matches internet.javascript-error[0]: route, role, category; finding has no locator

</details>

<details><summary>noise-003: 2 finding(s), status scored</summary>

- `pw-001-page-broken-image` **excused** → `internet.broken-images` [visual]: known baseline issue internet.broken-images: matches internet.broken-images[0]: route, role, category and selector
- `pw-002-page-pageerror` **excused** → `internet.javascript-error` [error-handling]: known baseline issue internet.javascript-error: matches internet.javascript-error[0]: route, role, category; finding has no locator

</details>

<details><summary>noise-004: 2 finding(s), status scored</summary>

- `pw-001-page-broken-image` **excused** → `internet.broken-images` [visual]: known baseline issue internet.broken-images: matches internet.broken-images[0]: route, role, category and selector
- `pw-002-page-pageerror` **excused** → `internet.javascript-error` [error-handling]: known baseline issue internet.javascript-error: matches internet.javascript-error[0]: route, role, category; finding has no locator

</details>

<details><summary>noise-005: 2 finding(s), status scored</summary>

- `pw-001-page-broken-image` **excused** → `internet.broken-images` [visual]: known baseline issue internet.broken-images: matches internet.broken-images[0]: route, role, category and selector
- `pw-002-page-pageerror` **excused** → `internet.javascript-error` [error-handling]: known baseline issue internet.javascript-error: matches internet.javascript-error[0]: route, role, category; finding has no locator

</details>

<details><summary>noise-006: 2 finding(s), status scored</summary>

- `pw-001-page-broken-image` **excused** → `internet.broken-images` [visual]: known baseline issue internet.broken-images: matches internet.broken-images[0]: route, role, category and selector
- `pw-002-page-pageerror` **excused** → `internet.javascript-error` [error-handling]: known baseline issue internet.javascript-error: matches internet.javascript-error[0]: route, role, category; finding has no locator

</details>
