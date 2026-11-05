# QA Bench: full brief

Written 4–5 Nov 2026 from Touchstone's `docs/BENCH.md` and `docs/QA_PARITY.md` (private repo `Vibernt/touchstone`).
This file is self-contained: you shouldn't need the Touchstone repo to build the bench. You need it only for the
Touchstone adapter.

**Status: plan. Nothing is built. Open decisions are in [DECISIONS.md](DECISIONS.md).**

## 1. Intent

**What we are making:** an open, tool-agnostic benchmark that answers one question with numbers:

> Given a website or web app, how many of its real problems does a QA system find, how many false alarms does it
> raise on changes made on purpose, how long does it take, and what does it cost?

**Who it serves:**
1. **Touchstone**, which uses it to prove, category by category, where it matches or beats a strong human QA team and
   where it doesn't. Its spikes SP34–SP46 (section 11) run here.
2. **The field.** It's published at B5 as a public benchmark with a leaderboard, so other agents, scripted suites
   and human vendors can be compared on the same footing.

**What success looks like at v1.0:**
- About 12 apps across the 10 tracks.
- At least 5 public planted defects and at least 3 deliberate changes for every category.
- A private held-out split.
- A scorer anyone can run locally with `docker compose`.
- Published scores for Touchstone, at least one other agent, one scripted suite and a paid human baseline.

**What it isn't:**
- **Not a load-testing or penetration-testing benchmark.** Security coverage is limited to hygiene and access
  control, the things a QA team checks.
- **Not a mobile-native benchmark.** Mobile here means mobile viewports in a browser. Real iOS Safari is a later
  spike (SP46).
- **Not a model benchmark.** It scores whole QA systems, including their cost.

## 2. What no existing benchmark gives us

Checked against published work in [REFERENCES.md](REFERENCES.md):
- **No benchmark labels deliberate changes.** None counts false alarms on changes made on purpose.
- **No benchmark spans all categories at once.**
  - WebTestBench: functional defects.
  - GUITestScape: Android display defects.
  - uxCUA and UXBench: usability.
  - ACT rules: accessibility.
  - Nothing covers functional, visual, copy, accessibility, speed, usability, email and permissions on the same
    apps.
- **No benchmark has signed-in, multi-role apps with email and code-based sign-in.**
- **No benchmark separates deterministic checks from judgement calls**, and none scores a judge's calibration.
- **No benchmark has a human baseline on the same builds.**

## 3. Principles

1. **Tool-agnostic.** The bench defines targets, ground truth and a scorer. Any system plugs in through a small
   adapter that returns findings.
2. **Self-hosted and reproducible.**
   - Every app runs from a pinned upstream commit or image digest.
   - Each app has a seeded database that resets for every episode.
   - Nothing runs against third-party live sites. The single exception is the read-only noise set (section 7.4).
3. **Ground truth is data.** Every planted defect and every deliberate change is a labelled entry with:
   - its category and class (section 4);
   - its severity and location;
   - the evidence that counts as finding it.
4. **Switchable mutations, not forks.**
   - Defects are small patches or runtime toggles on a pinned upstream.
   - One build can have any subset switched on.
   - Episodes mix several defects with deliberate changes, so a system can't win by reporting every change.
5. **A public split and a held-out split.** The held-out split (about 30%) stays private and only maintainers run
   it. This keeps scores meaningful after the public split leaks into model training data.
6. **Licence hygiene.**
   - Our own code and data: MIT.
   - Third-party code keeps its own licence in its own folder and is listed in `NOTICE`.
   - Anything we may not redistribute is fetched at setup by pinned digest and never committed.
7. **Cost is part of the score.** Every run reports wall time and spend: model, compute and human hours.

## 4. The core idea: deterministic, judged, human

Every label carries a **class**.

**Deterministic.** A check is deterministic when all three hold:
1. The expected outcome can be written down as data before the run.
2. Code can compare what happened with that expectation, without interpretation.
3. Two careful people looking at the same evidence would always agree.

**Judged.** If any one of the three fails, it is a judgement.

**Human-only.** A judgement is human-only when it decides:
- what the product *should* do (intent, policy, permissions); or
- what becomes a check (promotion stays with the owner).

| Deterministic (replay-grade) | Judged | Human-only |
|---|---|---|
| Element present, status codes, console and network errors | Is this visual difference a defect or a content change? | Was this change intended? (until a judge has earned that call for a kind) |
| axe rules, keyboard reachability, focus trap, reflow at 200% and 400% | Does this page look broken beyond what the geometry rules catch? | What should each role be allowed to see? |
| Layout geometry; LCP and CLS budgets; Lighthouse scores | Is this copy confusing, off-brand or wrong in tone? | Approving expectations proposed from docs |
| Invariants (total equals the sum of lines; list count equals detail) | Does the UI handle this injected fault gracefully? | Real-user research |
| Same answer by two routes (pricing page, checkout and invoice agree) | Is this failure the same problem as an earlier one? | |
| Text faults by regex: placeholder text, raw i18n keys, `undefined`, `NaN`, `{{` | | |
| Off-token colours and fonts | | |
| Email arrived, link works, code accepted, test payment settled | | |
| Security headers, cookie flags, mixed content, exposed source maps | | |
| Untranslated strings, pseudo-locale overflow | | |

**Detect deterministically; judge only what was detected.** Most judgements have a deterministic detector, such as a
masked screenshot diff, a text change or a change from a stable baseline. The bench scores detectors and judges
separately, so we can see which layer missed.

Touchstone's judging stage, which the bench calibrates:
- **Order:** a cheap judge model (JEV) first, then an LLM, then a person.
- **Confidence:** each step escalates when its confidence is low.
- **Earned autonomy:**
  - *shadow*: the judge runs, but its call isn't used;
  - *suggest*: at ≥ 95% precision on 50 labelled cases;
  - *auto*: at ≥ 98% on 200, with 1 in 20 spot-checked.

Track 7.9 produces those numbers.

## 5. Repository layout (target)

```
qa-bench/
  LICENSE                MIT (ours)
  NOTICE                 every third-party source, its licence, and what we changed
  apps/<app>/
    upstream.json        repo, commit or image digest, licence, use (adopt | mutate | run-only)
    compose.yaml         how to run it; resets to the seed for every episode
    seed/                seeded data and test accounts per role (test values only)
    mutations/<id>/      patch or toggle, plus label.yaml
    changes/<id>/        deliberate changes (not bugs), plus label.yaml
  operators/             category-level mutation operators, instantiated per app
  tracks/<track>.yaml    which apps, mutations and changes make up a track
  episodes/              generated: a build = app + mutations + changes, with a sealed answer key
  harness/
    adapters/            touchstone, playwright-suite, browsergym-agent, human
    runner/              brings up an episode, hands the adapter a brief, collects findings, tears down
  scorer/                matches findings to the answer key; writes the report
  judge-sets/            labelled screenshot, copy and accessible-name items for judge calibration
  leaderboard/           results per system, per track, per bench version
  schemas/               JSON Schemas for upstream.json, label.yaml, track, episode, brief, findings, report
```

The held-out split lives in a separate private repo (`qa-bench-heldout`, name to confirm) and is mounted at run
time.

**Language and tooling** (recommended, not yet decided):
- **Harness and scorer:** TypeScript on Node 22 LTS. This matches Touchstone's stack, so its adapter is thin.
- **App runtime:** docker compose.
- **Contracts:** JSON Schema, validated in CI.
- **Tests:** vitest for unit tests. Browser tests run natively, never in a sandbox (see [AGENTS.md](../AGENTS.md)).

## 6. Contracts

### 6.1 `upstream.json`
```json
{
  "app": "swag-labs",
  "repo": "https://github.com/saucelabs/sample-app-web",
  "pin": { "commit": "<sha>" },
  "licence": "MIT",
  "licence_checked": "2026-11-04",
  "use": "adopt",
  "notes": "Built-in faulty users: problem_user, error_user, visual_user, performance_glitch_user"
}
```
`use` takes one of three values:
- `adopt`: vendored here, modified and redistributed;
- `mutate`: run pinned upstream, with our patches published;
- `run-only`: fetched at setup, never redistributed.

### 6.2 `label.yaml`
```yaml
id: expense.wrong-total
app: expense-app
track: regression
kind: defect            # defect | change
category: consistency   # functional | consistency | permission | error-handling | visual | copy | a11y |
                        # perf | usability | email | security-hygiene | l10n
class: deterministic    # deterministic | judged | human
severity: major         # critical | major | minor
where: { route: /expenses, role: viewer, step: list }
found_by:               # the evidence that counts as finding it; any one matches
  - kind: value
    selector: "[data-testid=total]"
    note: "Total omits the last row"
tolerance: { route: exact, region_px: 48 }
split: public           # public | heldout
```

### 6.3 Episode
An episode is the unit the runner brings up and tears down:
- one app at a pinned build;
- a set of switched-on mutations and deliberate changes;
- a seed;
- a sealed answer key.

Episodes are generated from track files with a fixed random seed, so they can be reproduced.

### 6.4 Adapter contract
**Input (the brief):**
- the target URL or URLs;
- roles, and test accounts per role (generated per episode);
- the inbox address and inbox API;
- a time budget and a money budget;
- optionally, the journeys to replay (regression track) or a goal (usability track).

**Output (findings):** a list, where each finding has:
- `where`: route, role, step, and optionally selector or region;
- `category`;
- a short description;
- evidence: screenshots, network entries, DOM excerpts;
- `confidence` from 0 to 1;
- optionally, steps to reproduce.

The adapter also reports `cost` and `wall_time` when it can. **An adapter never sees the answer key.**

**Planned adapters:**

| Adapter | Description |
|---|---|
| `touchstone` | Calls Touchstone's run API. Touchstone owns its own cost metering |
| `playwright-suite` | Runs a fixed scripted suite per app; the floor a scripted QA team would reach |
| `browsergym-agent` | Wraps any BrowserGym agent |
| `human` | Gives a tester the same brief and a form to file findings in the same schema |

### 6.5 Report
- **Run metadata:**
  - bench version;
  - upstream digests;
  - system name and version;
  - seed.
- **Per track, category and class:** the metrics in section 9.
- **Every finding:** its match decision and the reason.

## 7. Tracks

| # | Track | Apps | What it measures | Feeds (Touchstone spikes and cards) |
|---|---|---|---|---|
| 7.1 | **Regression** | Expense app, Conduit, ParaBank, Swag Labs | Planted functional, consistency and permission bugs in known journeys, plus a deliberate-change twin for false alarms | Replay credibility; SP37, SP39 |
| 7.2 | **Natural defects** | WebTestBench apps (adopted) | Finding real defects with no checklist given | SP43 |
| 7.3 | **Visual, copy and design** | Expense app, Ghost theme, Saleor dashboard, Swag Labs `visual_user` | Planted visual and copy faults against deliberate redesigns and content changes | SP34, SP36 |
| 7.4 | **Noise** | fragmatic.ai and opensenselabs.com (read-only, by existing permission), the-internet, UI Testing Playground, Excalidraw | How often detectors and judges fire when nothing is wrong | SP35 |
| 7.5 | **Accessibility** | ACT test cases (adopted), plus planted keyboard, zoom and focus faults in the expense app and Conduit | Accessibility per rule and across whole journeys | SP38 |
| 7.6 | **Email and sign-in** | Ghost, Cal.com, Keycloak, Mailpit | Verification links, receipts, magic links, one-time codes, timezones in emails | SP40 |
| 7.7 | **Exploration** | Juice Shop, Medusa admin, Cal.com | Unknown bugs with no journeys given: permission leaks, double submits, concurrency, error handling under injected faults | SP41, SP43 |
| 7.8 | **Usability** | WebArena and VisualWebArena (run only), plus agent-inserted usability defects in the expense app and Conduit | Goal-only agents: whether step counts are stable, and whether defects move them | SP42 |
| 7.9 | **Judge calibration** | `judge-sets/` built from 7.3 and 7.5, plus UI-UX UXBench (run only) | Precision, recall and calibration per judge kind; agreement between JEV and the LLM | SP34 |
| 7.10 | **Human baseline** | A fixed episode set drawn from 7.1, 7.3, 7.6 and 7.7 | Paid testers against Touchstone on the same builds | SP45 |

**Noise-set rules (7.4), which can't be broken:**
- **fragmatic.ai:** read-only. The one exception is the tagged test contact form, at most 5 submissions per run.
  The bench doesn't use the form.
- **opensenselabs.com:** GET only, no forms, robots.txt honoured, at least 1 second between page loads.

## 8. Mutations and deliberate changes

### 8.1 Operator catalogue (v1)

Operators are written once per category and then applied to each app.

| Category | Example operators | Class |
|---|---|---|
| Functional | Button does nothing; wrong redirect; form silently drops a field; filter ignores one value | deterministic |
| Consistency | Total ≠ sum of lines; list count ≠ detail; checkout price ≠ pricing page; rounding | deterministic |
| Permission | Role B sees role A's record; button hidden but endpoint open | deterministic |
| Error handling | 500 shows a blank page; retry double-charges; spinner never ends after a failed request | deterministic to detect; judged for graceful |
| Visual | Overlap; clipped text; broken image; wrong z-index; off-token colour; misaligned grid | deterministic (geometry, tokens); judged ("looks broken") |
| Copy | Placeholder text left in; raw i18n keys; `undefined` or `NaN`; wrong tone; misleading error message | deterministic (regex); judged (tone, clarity) |
| Accessibility | Missing label; focus trap; invisible focus; reflow break at 400%; meaningless names | deterministic; judged (name quality) |
| Speed | Large blocking script; layout shift on load; slow API on one route | deterministic |
| Usability | Extra step; hidden primary action; ambiguous labels; confusing order | judged or measured |
| Email | Link points to the wrong host; expired token; wrong timezone; missing email | deterministic |
| Security hygiene | Missing headers; exposed source maps; secret in the bundle; insecure cookie | deterministic |
| Localisation | Untranslated string; overflow in a long locale; wrong date format | deterministic |

### 8.2 Deliberate changes

These are labelled `kind: change`. Reporting one as a problem scores a false alarm.

Examples:
- redesign a page;
- reword copy;
- change a price;
- add a step on purpose;
- move navigation;
- swap images;
- add a seasonal banner.

### 8.3 Agent-generated mutations

Coding agents propose new mutations from the operator list, following the uxCUA method. A proposal enters the bench
only if it passes validation:
1. It builds.
2. The labelled `found_by` evidence appears.
3. The unmutated build doesn't show that evidence.

A person reviews a sample of those that pass.

## 9. Scoring

Per system, track, category and class:
- **Recall:** the share of planted defects found. A finding counts when it matches a `found_by` entry within the
  label's tolerance.
- **Precision:** findings that match a planted defect, divided by all findings.
- **False alarms on deliberate changes:** per 100 episodes, reported separately from precision.
- **Time:** time to first detection, and total wall time.
- **Cost per defect found:** model spend, compute and human hours at a stated rate.
- **Repro quality:** a fixed repair agent (UXBench method) or a reviewer tries to reproduce each true finding from
  the report alone. The score is the share that reproduce.
- **Judges** (track 7.9):
  - precision and recall per kind;
  - a reliability curve (confidence against accuracy);
  - agreement between JEV and the LLM.

Reports are versioned: `bench vX.Y`, upstream digests, system version and seed. Outside leaderboard entries are
accepted only with the full run record.

**Matching** is a hand-written, deterministic matcher on route, role and category, plus selector or region overlap.
Where the description has to be read, an LLM matcher is allowed, but only:
- with a fixed prompt and a pinned model;
- with its decisions logged;
- with a sample spot-checked by a person.

The matcher's own agreement with people is published.

## 10. Infrastructure

- **Local:** `docker compose` per app. A full track runs on one machine.
- **Hosted episodes** (for Touchstone and human testers):
  - exact-named `touchstone-bench-*` resources in our Fly organisation or Northflank project;
  - one app per episode, reset from the seed, torn down by exact name;
  - spend capped and metered;
  - provider details are kept in Touchstone's private docs, not here.
- **Inbox:** one Mailpit per episode, reachable only from the episode's network.
- **Identity:** Keycloak with test realms, plus test accounts generated per episode. These are never real
  credentials and are recorded only in the episode's seed.
- **Human testers:**
  - each gets the same brief as an adapter, a time box and an episode URL;
  - their findings go through the same scorer;
  - the vendor and budget are an owner decision (BD5).

## 11. Spikes the bench serves (Touchstone's SP34–SP46)

| Spike | Question | Track |
|---|---|---|
| SP34 | How do JEV, the LLM and a person compare on labelled screenshot and copy items, including deliberate changes? | 7.9 |
| SP35 | How often do detectors and the judge fire on unchanged real sites, and what is the cache hit rate? | 7.4 |
| SP36 | Does judging against the approved baseline beat judging a single screenshot? | 7.3 |
| SP37 | WebKit and Firefox against Chromium: image size, boot time, run time, flakiness, and whether verdicts match | 7.1 |
| SP38 | What share of journeys can be replayed by keyboard alone, and how accurate is focus detection on the ACT cases? | 7.5 |
| SP39 | Of the rules agents propose from the survey and docs, how many are true, and do they catch planted calculation bugs? | 7.1 |
| SP40 | Test inbox: latency, reliability, link extraction | 7.6 |
| SP41 | Which injected faults expose planted error-handling bugs, and how many false alarms do they cause? | 7.7 |
| SP42 | Are goal-only agents' step counts stable, and do planted usability defects move them beyond the noise? | 7.8 |
| SP43 | Touchstone's bug hunt, with clean-replay confirmation, against WebTestBench's published < 30% F1 | 7.2 |
| SP44 | Can cri-ci's page-audit pack run inside Touchstone's runner? | not the bench |
| SP45 | Paid human testers against Touchstone on the same builds | 7.10 |
| SP46 | Real iOS Safari through a device cloud | not the bench (later) |

## 12. Phases

| Phase | Scope | Exit |
|---|---|---|
| **B0 Skeleton** | Schemas, runner, scorer, episode generator; tracks 7.1 and 7.4 with the expense app, Swag Labs and the-internet; the `touchstone` and `playwright-suite` adapters | Touchstone scored end to end on 20 episodes; the deliberate-change twin produces a false-alarm number |
| **B1 Breadth** | Conduit, ParaBank, Ghost, Mailpit, Keycloak; tracks 7.3, 7.5 and 7.6; WebTestBench imported (7.2) | Every category has ≥ 5 public mutations and ≥ 3 deliberate changes |
| **B2 Judges** | `judge-sets/` with ≥ 300 labelled items; track 7.9; SP34 and SP36 | Calibration curves per judge kind |
| **B3 Exploration and usability** | Juice Shop, Medusa admin, Cal.com, WebArena (run only); tracks 7.7 and 7.8; fault injection | SP41, SP42 and SP43 results |
| **B4 Human baseline** | Fixed episode set, testers, track 7.10 | SP45: humans against Touchstone by category, with cost |
| **B5 Public release** | Public split, docs, leaderboard, citation, outside submissions; held-out split stays private | `qa-bench v1.0` tagged; licences rechecked |

**B0 in detail** (the next work):
1. `schemas/` for every contract in section 6, with a CI job that validates every YAML and JSON file in the repo.
2. `apps/swag-labs/` and `apps/the-internet/`: `upstream.json`, `compose.yaml` and a seed or reset script.
3. `apps/expense-app/`: the code is in `apps/expense-app/app` (BD2, 5 Nov).
   - Its 7 switchable defects map directly to labels: `permission_bypass`, `stale_state`, `ignored_filter`,
     `wrong_total`, `missing_persistence`, `duplicate_write` and `misleading_success`.
   - Its `VARIANT=relabel` mode is the first deliberate change. It renames buttons and titles but leaves behaviour
     the same.
4. Swag Labs' built-in faulty users become labelled defects. A deliberate-change twin is written for each app.
5. `harness/runner`: bring up an episode, issue the brief, collect findings and tear down. Local docker only.
6. `scorer/`: the deterministic matcher, the metrics in section 9, and a JSON and Markdown report.
7. Adapters: `playwright-suite` first (cheap and deterministic, so it validates the scorer), then `touchstone`.
8. Generate 20 episodes and score both adapters.

**Upkeep:**
- Every quarter: bump upstream pins and rebase mutations. A mutation that no longer applies is fixed or retired,
  and the changelog says which.
- Recheck licences at every bump.
- Refresh the held-out split every release.
