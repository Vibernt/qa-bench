# QA Bench

**An open, tool-agnostic benchmark for QA of websites and web apps.**

Given a web app, how many of its real problems does a QA system find, and how many false alarms does it raise on
changes made on purpose? How long does it take, and what does it cost? QA Bench answers these with numbers. It
works the same for every kind of tester:
- AI agents;
- scripted suites (Playwright, Cypress…);
- QA services with an API;
- paid human testers.

Every system gets the same brief and runs against the same pinned builds. One scorer scores them all against the
same sealed answer key.

**Status:** phase B0 (skeleton) is built and scored end to end. See [Results](#results) and
[docs/HANDOFF.md](docs/HANDOFF.md). The repository is MIT-licensed.

## Contents
- [How it works](#how-it-works)
- [Quick start](#quick-start)
- [Guide for people](#guide-for-people): manual testing, adding apps and labels, reading results
- [Guide for agents](#guide-for-agents): getting your system scored, and contributing to this repo
- [Commands](#commands)
- [Scoring](#scoring)
- [Results](#results)
- [Repository layout](#repository-layout)
- [Licence](#licence)

## How it works

```
tracks/*.yaml ──generate──▶ episodes/<track>/<id>/episode.json + answer-key.json   (sealed)
                                     │
                         run (docker compose up)
                                     │
                    brief.json ──▶ adapter ──▶ findings.json
                                     │
                              score (matcher) ──▶ report.json + report.md
```

- **App** (`apps/<app>/`): a web app pinned to an exact upstream commit, with a `compose.yaml`. Every episode
  starts it fresh, so the seed data resets every time.
- **Label** (`label.yaml`): one entry in the ground truth. There are three kinds:
  - **defect**: a planted bug that can be switched on. Finding it counts towards recall.
  - **change**: a deliberate change, such as reworded copy, a seasonal banner or a price change. Reporting it as a
    problem is a false alarm.
  - **baseline**: something broken on purpose in the unmutated app, such as a demo page of broken images. Findings
    that match it are excused.

  Every label also says:
  - its **category** (functional, consistency, permission, error-handling, visual, copy, a11y, perf, usability,
    email, security-hygiene, l10n);
  - its **class**: *deterministic*, *judged* or *human* (see [docs/BRIEF.md §4](docs/BRIEF.md));
  - the **evidence** that counts as finding it.
- **Track** (`tracks/*.yaml`): which apps and labels make up one kind of test. There are four:
  - `regression` (7.1): planted bugs in known journeys, 2-3 per mixed episode with at most one blatant;
  - `exploration` (7.7): the same apps and defect mix, but the brief gives only the URL, the roles and the
    product's one-line purpose, with no journeys or checklist;
  - `noise` (7.4): hard pages that aren't broken;
  - `visual` (7.3): layout, visual and accessibility faults that change only the rendered page, never its text or
    behaviour, against deliberate redesigns. The brief gives the supported devices.
- **Episode:** one build of one app, with a set of defects and changes switched on, its own generated test accounts
  and a sealed answer key. Episodes are generated from a track with a fixed seed, so they are reproducible.
  - **Twin** episodes switch on only deliberate changes, so anything reported in them is a false alarm.
  - **Clean** episodes switch on nothing.
- **Brief** (`brief.json`): everything the system under test is told. That is the target URLs, the roles and their
  accounts, a time and money budget, and optionally journeys, pages or a goal. It never says what is switched on.
- **Adapter** (`harness/adapters/<name>/`): plugs one system into the bench. It reads the brief and writes
  `findings.json`. Container adapters run with only the brief (read-only) and an output folder mounted, so they
  can't read the answer key.
- **Scorer** (`scorer/`): a deterministic matcher. It pairs each finding with a label by route, role, category and
  selector or region, then reports recall, precision, false alarms, time and cost.

## Quick start

You need:
- Docker with compose v2;
- Node 22 or later;
- about 5 GB of disk.

```bash
npm ci
npm run check
```
`npm run check` lints, validates every contract file and runs the unit tests. It needs no Docker.

```bash
npx tsx bin/qa-bench.ts build-apps
```
Builds the expense app, Swag Labs and the-internet images.

```bash
npx tsx bin/qa-bench.ts generate --all
```
Writes `episodes/` (24 regression, 17 exploration and 6 noise episodes).

```bash
npx tsx bin/qa-bench.ts run --adapter playwright-suite --track regression --parallel 4
```
Runs the scripted suite on every regression episode, then scores it.

```bash
npx tsx bin/qa-bench.ts report runs/<run-id>
```
Prints the Markdown report.

Notes:
- **Speed:** a full regression run with `playwright-suite` takes about 2.5 minutes with `--parallel 4`. The
  `noop` adapter, which reports nothing, takes seconds; it is the zero floor and a quick check that Docker is set
  up.
- **Behind a TLS-intercepting proxy:** set `QA_BENCH_BUILD_CA=<path to the proxy's CA pem>`. Image builds then pass
  it as a build secret. Nothing is baked into the images.

## Guide for people

### Test an episode by hand (the `human` adapter)
```bash
npx tsx bin/qa-bench.ts up regression-004
```
This brings the episode up on `127.0.0.1` and prints:
- the URL to open and an account for each role;
- your time budget;
- where to write your findings.

Test the app using only what the brief tells you. Write `findings.json` starting from
[`harness/adapters/human/findings.template.json`](harness/adapters/human/findings.template.json), then:
```bash
npx tsx bin/qa-bench.ts down <session>/regression-004
```
```bash
npx tsx bin/qa-bench.ts run --adapter human --episodes regression-004 --findings runs/<session>/regression-004/out/findings.json
```
Your findings are scored exactly like any system's. Full instructions and rules are in
[harness/adapters/human/README.md](harness/adapters/human/README.md). Don't open `apps/*/mutations`, `changes`,
`baseline`, `episodes/` or `verify.ts` first: they hold the answers.

### Add an app, a defect or a deliberate change
1. **Check the licence first.**
   - Read the app's LICENSE file.
   - Record the licence and the date you checked in `apps/<app>/upstream.json` and in [NOTICE](NOTICE).
   - Choose how we use it:
     - `adopt`: vendored here;
     - `mutate`: pinned upstream plus our published patches;
     - `run-only`: fetched at build time, never committed.
   - Never publish mutations of GPL or AGPL apps.
2. **Write the app's files.** Use [apps/expense-app](apps/expense-app) as the model:
   - `compose.yaml` with an `app` service, `image: qa-bench-app-<app>:local`, a healthcheck and no host ports;
   - `app.yaml`: targets, roles (accounts are generated per episode and passed in by env), journeys and pages;
   - one `label.yaml` per defect (`mutations/<id>/`), deliberate change (`changes/<id>/`) or on-purpose quirk
     (`baseline/<id>/`). Every defect and change has a `switch` (environment variables).
3. **Write `apps/<app>/verify.ts`.** It must prove that every `found_by` symptom appears with its switch on and
   does **not** appear on the clean build ([BRIEF §8.3](docs/BRIEF.md)). Run it with
   `npx tsx apps/<app>/verify.ts`.
4. **Add the app to a track and check the repo:**
   ```bash
   npm run check
   ```
   ```bash
   npx tsx bin/qa-bench.ts generate --all
   ```
   Generation warns you if a label is never switched on.

### Read a report
Every run folder has `report.md`, which contains:
- headline metrics;
- per-track and per-category tables;
- every finding with its decision and the reason. For example, an `unmatched` finding names the label it came
  closest to.

`report.json` holds the same data for tools. Checked-in results are in [leaderboard/](leaderboard/).

## Guide for agents

### If you are a QA system (or build one) and want to be scored
Pick the adapter shape that fits your system.

1. **A container (most agents and suites).** Create `harness/adapters/<name>/` with an `adapter.json`
   (`mode: container`, `build: Dockerfile`, `network: episode`) and a self-contained image. The runner starts it
   with:
   - **Input:** `/bench/brief/brief.json`, read-only
     ([schemas/brief.schema.json](schemas/brief.schema.json)). The `targets[].url` values are reachable from
     inside the container.
   - **Output:** write `/bench/out/findings.json` ([schemas/findings.schema.json](schemas/findings.schema.json))
     and put screenshots in `/bench/out/evidence/`.
   - **Env:** only the names you list in `env_passthrough` (API keys, for example), with values from the host.
   - **Limits:**
     - you are killed at `budget.wall_time_s` plus a grace period;
     - if the brief has `rules` (live sites), obey them in code: allowed methods, no form submits, robots.txt,
       the minimum interval between page loads, the page cap.

   [`playwright-suite`](harness/adapters/playwright-suite) is a complete example, and
   [`noop`](harness/adapters/noop) is the smallest one.
2. **A service with an HTTP API.** Serve three endpoints (start a run, run status, findings) and use the
   [`http-api`](harness/adapters/http-api) adapter. Your code doesn't need to live in this repo.
3. **A person.** Use the [`human`](harness/adapters/human) adapter.

**What makes a good finding:**
- **`where.route`:** the URL path, with no host or query string.
- **`where.role`:** the role from the brief.
- **`where.selector`:** an attribute selector such as `[data-test="inventory-item-price"]`, when one element is
  involved.
- **`category`:** from the bench's list.
- **Description and confidence:** a short description, and an honest confidence.
- **Cost:** report it (`cost.model_usd`, `compute_usd`, `human_hours`) so cost per defect found can be computed.

The matcher is deterministic and documented in [scorer/README.md](scorer/README.md). Vague findings, such as
those with no route or the wrong category, don't match. Reporting deliberate changes as bugs costs you
false-alarm points.

**Never read the answer key.** That covers `apps/*/mutations`, `apps/*/changes`, `apps/*/baseline`, `episodes/`,
`answer-key.json` and `apps/*/verify.ts`. Container adapters can't reach them. Anything else that reads them is
disqualified, and leaderboard entries are accepted only with their full run record.

### If you are a coding agent working on this repo
Read [AGENTS.md](AGENTS.md) (standing rules) and [docs/HANDOFF.md](docs/HANDOFF.md) (where things stand and what's
next). The short version:
- run `npm run check` before every commit;
- run the app's `verify.ts` after touching labels or apps;
- use small conventional commits;
- check licences before adding any code;
- never read answer keys from adapter code;
- browser and Docker tests run natively, never in CI or inside a sandboxed sub-agent.

## Commands

All commands run as `npx tsx bin/qa-bench.ts <command>`, or as `npm run qa-bench -- <command>`.

| Command | What it does |
|---|---|
| `validate` | Validate every contract file (YAML and JSON) against `schemas/`, plus cross-file checks |
| `generate <track…> \| --all [--live] [--heldout-root D]` | Generate episodes from `tracks/<track>.yaml` (deterministic) |
| `build-apps [app…]` | Build app images once, so episodes start fast (`QA_BENCH_BUILD_CA` for proxies) |
| `run --adapter <name> (--track T \| --episodes a,b) [--parallel N] [--run-id X] [--findings F]` | Run episodes with an adapter, then score them. Writes `runs/<run-id>/` |
| `up <episode> [--session S]` and `down <session>/<episode>` | Bring one episode up for a person, and take it down |
| `score <runDir>` and `report <runDir>` | Re-score a run; `report` also prints `report.md` |

**Live sites:** the noise track has two live sites, generated only with `--live` and run only with
`QA_BENCH_ALLOW_LIVE=1`. They are never run in CI. Their rules (GET only, no forms, robots.txt honoured, at least
1 s between page loads) are in the brief, and adapters must obey them.

## Scoring

These are reported per system, track, category and class ([BRIEF §9](docs/BRIEF.md), [scorer/README.md](scorer/README.md)):
- **Recall:** planted defects found ÷ planted defects.
- **Precision:** findings that match a planted defect ÷ findings. Excused findings are left out.
- **False alarms per 100 episodes:** deliberate changes reported as problems.
- **Unmatched findings per episode:** the headline for the noise track.
- **Time:** time to first detection, and total wall time.
- **Cost:** total cost, and cost per defect found.

Every report records:
- the bench version;
- each app's upstream pin;
- the seed of each track;
- the sha256 of every answer key it was scored against.

## Results

These are the B0 exit-check results, on 17 regression and 6 noise episodes. Details are in
[leaderboard/README.md](leaderboard/README.md).

| System | Track | Recall | Precision | False alarms /100 ep | Unmatched /ep | Wall time |
|---|---|---|---|---|---|---|
| `playwright-suite` 0.1.0 | regression | 100% (12/12) | 78.0% | 41.2 | 0.00 | 306 s |
| `playwright-suite` 0.1.0 | noise | — | — | 0.0 | 0.00 | 121 s |
| `noop` (floor) | regression | 0% | — | 0.0 | 0.00 | 9 s |

These are agent runs on a 10-episode sample (8 regression, 2 noise) with the same scorer. Details are in
[leaderboard/b0-agents/README.md](leaderboard/b0-agents/README.md).

| System | Planted recall | Natural bugs found | Precision | False alarms /100 ep | Est. model cost (10 ep) |
|---|---|---|---|---|---|
| Claude Sonnet 5.5, high effort | 100% (6/6) | 2 of 5 | 96.0% | 0 | $0.75 |
| Claude Haiku 5.5, low effort | 100% (6/6) | 2 of 5 | 95.2% | 0 | $0.04 |
| Claude Sonnet 5.5, low effort | 100% (6/6) | 0 of 5 | 87.5% | 10 | $0.59 |
| Claude Haiku 5.5, high effort | 100% (6/6) | 3 of 5 | 84.8% | 0 | $0.04 |
| `playwright-suite`, same 10 episodes | 100% (6/6) | 0 of 5 | 78.0% | 50 | $0 |

On the harder 0.2 bench (12 episodes: 6 regression and 6 exploratory, with 17 planted defects, 10 of them subtle,
and 14 verified natural bugs), the same configurations separate clearly. Details are in
[leaderboard/v0.2-agents/README.md](leaderboard/v0.2-agents/README.md).

| System | Planted recall | Subtle | Natural bugs found | Precision | False alarms /100 ep | Est. model cost (12 ep) |
|---|---|---|---|---|---|---|
| Claude Haiku 5.5, high effort | 100% (17/17) | 10/10 | 5 of 14 | 92.7% | 0 | $0.03 |
| Claude Sonnet 5.5, high effort | 88.2% (15/17) | 8/10 | 7 of 14 | 95.5% | 0 | $0.35 |
| Claude Haiku 5.5, low effort | 52.9% (9/17) | 3/10 | 4 of 14 | 81.8% | 0 | $0.01 |
| Claude Sonnet 5.5, low effort | 35.3% (6/17) | 2/10 | 1 of 14 | 73.3% | 8.3 | $0.19 |
| `playwright-suite`, same 12 episodes | 35.3% (6/17) | 0/10 | 0 of 14 | 65.0% | 66.7 | $0 |

One run per configuration on 12 episodes, so the intervals are wide: the two high-effort configurations can't be
told apart yet.

On the visual track (7.3: 12 episodes, 17 planted visual and accessibility faults that leave the page's text and
behaviour intact), only systems that look at or measure the rendered page find anything. Details are in
[leaderboard/v0.3-visual-agents/README.md](leaderboard/v0.3-visual-agents/README.md).

| System | Planted recall | Subtle | Precision | Screenshots looked at /ep | Est. model cost (12 ep) |
|---|---|---|---|---|---|
| Claude Haiku 5.5, high effort | 100% (17/17) | 9/9 | 98.1% | 7.2 | $0.03 |
| Claude Sonnet 5.5, high effort | 100% (17/17) | 9/9 | 97.4% | 7.4 | $0.35 |
| Claude Haiku 5.5, low effort | 70.6% (12/17) | 6/9 | 100% | 2.8 | $0.01 |
| Claude Sonnet 5.5, low effort | 64.7% (11/17) | 3/9 | 95.5% | 2.8 | $0.18 |
| `playwright-suite`, same 12 episodes | 11.8% (2/17) | 0/9 | 100% | — | $0 |

## Repository layout

```
apps/<app>/            upstream.json, app.yaml, compose.yaml, labels (mutations/, changes/, baseline/, natural/), verify.ts
tracks/                track definitions (regression, exploration, noise, visual)
episodes/              generated, not committed (regenerate with `generate --all`)
harness/generator/     episode generator
harness/runner/        brings episodes up, runs adapters sealed, tears down
harness/adapters/      playwright-suite, http-api, human, noop
harness/agents/        orchestrator-driven agent runs: configs, episode sets, one prompt, prepare/finish
scorer/                deterministic matcher, metrics, JSON and Markdown reports
schemas/               JSON Schemas for every contract
leaderboard/           checked-in results per bench version
docs/                  the brief, app list, references, requirements, decisions, handoff
```

## Licence

Our own code and data are MIT ([LICENSE](LICENSE)). Third-party material keeps its own licence and is listed in
[NOTICE](NOTICE). Material we may not redistribute is fetched at build time by pinned commit and never committed.
