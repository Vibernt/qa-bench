# Handoff: 5 Nov 2026

You can resume from this file with no earlier conversation. Read it, then the [README](../README.md) (how to use the
bench), [BRIEF.md](BRIEF.md) (the design), [APPS.md](APPS.md), [DECISIONS.md](DECISIONS.md) and
[../AGENTS.md](../AGENTS.md) (standing rules).

## State
**B0 (skeleton) is done.** Its exit check is in [leaderboard/](../leaderboard/README.md): 23 episodes were scored end
to end for two systems, and the twin episodes produce a false-alarm number. Four Claude agent configurations have
also been scored on a 10-episode sample, and their runs fed the first quality round:
- severity weights;
- category families in the matcher;
- precise deliberate-change labels;
- natural defects.

| Piece | Where | Proof |
|---|---|---|
| Contracts | `schemas/` (10 JSON Schemas), `lib/contracts.ts` | `npm run validate`: every YAML and JSON file in the repo, plus cross-file checks |
| Expense app (ours) | `apps/expense-app` (code in `app/`, bench wrapper `bench-entry.mjs`) | 7 defects, 1 change. `verify.ts` 17/17; the app's own 34 tests pass on Node 26 |
| Swag Labs (vendored, MIT) | `apps/swag-labs` (`upstream/` at `ad62bb2`) | 5 faulty-user defects, 4 changes. `verify.ts` 155/155 |
| the-internet (run-only, Apache-2.0) | `apps/the-internet` (fetched at build time at `4126619`) | 10 baseline labels, 1 change. `verify.ts` passes |
| Survey site (ours) | `apps/survey-site` | Not wired into a track yet (B1) |
| Generator | `harness/generator` | Seeded and byte-reproducible; clean and twin episodes; exclusive groups; held-out labels kept out of public episodes |
| Runner | `harness/runner` | Builds images once per run; sealed container adapters (only brief/ read-only and out/ mounted); budget kill; teardown always; `up`/`down` for people |
| Scorer | `scorer/` | Deterministic matcher `deterministic-3` (category families, description patterns), every BRIEF §9 metric except repro quality, plus severity-weighted recall and F1, severity agreement and natural recall; JSON and Markdown |
| Adapters | `harness/adapters/{playwright-suite,http-api,human,noop}` | See each README |
| Agent runs | `harness/agents` (configs, episode sets, one prompt, `agents prepare/finish`) | Haiku 5.5 and Sonnet 5.5 at low and high effort on `b0-sample-10`: `leaderboard/b0-agents/` |
| Natural defects | `apps/*/natural/` | 5 verified real bugs found by the agent runs, each with a `verify.ts` check |
| Tracks | `tracks/regression.yaml` (17 episodes), `tracks/noise.yaml` (6 + 2 live sites, generated only with `--live`) | Every defect and change is planted at least once (unit test) |
| CLI | `bin/qa-bench.ts` | `validate`, `generate`, `build-apps`, `run`, `up`, `down`, `score`, `report` |
| CI | `.github/workflows/ci.yml` | Lint and typecheck, validate, unit tests (142). No Docker or browsers in CI |

## How to resume
```bash
npm ci
```
```bash
npm run check
```
```bash
npx tsx bin/qa-bench.ts build-apps
```
```bash
npx tsx bin/qa-bench.ts generate --all
```
```bash
npx tsx bin/qa-bench.ts run --adapter noop --track regression --parallel 4
```
The `noop` run is a smoke test that takes seconds. Behind a TLS-intercepting proxy, set
`QA_BENCH_BUILD_CA=<ca.pem>` first.

## Known issues and limits
- **Swag Labs' runtime config is readable in the browser.** Swag Labs is a client-side app, so
  `/runtime-config.js` holds the episode's switches as bit flags, not names. An adapter that decodes it is cheating
  (AGENTS.md rule 8). A server-side switch would close this; it isn't worth it until outside entries arrive.
- **Swag Labs mutations are mutually exclusive.** All five share `exclusive: swag-user`, because upstream's faulty
  users mask each other. If two behaviours ever need to share an episode, `switch.exclusive` would have to accept a
  list.
- **`internet.third-party-requests` is broad.** It has route `*` and category error-handling, because the Optimizely
  beacon fails on every page in an offline episode. It excuses any error-handling finding on the-internet.
- **Our own apps are pinned by path, not commit.** `expense-app` and `survey-site` live in this repo, so the bench
  commit is their pin.
- **Not exercised yet:**
  - `http-api` against a real system (only its unit tests with a fake API);
  - the live noise sites (`--live` plus `QA_BENCH_ALLOW_LIVE=1`; rules are enforced by unit tests only);
  - hosted episodes (BD4).
- **Repro quality** (BRIEF §9) is reported as null. It is next-step 6.
- **The deterministic matcher can't read meaning.**
  - Description patterns are a deterministic stand-in, used only where labels collide.
  - An LLM matcher with a fixed prompt, logged decisions and maintainer spot-checks is the planned upgrade.
- **Agent runs** use Claude Code subagents. Sealing is by instruction, plus an audit of every tool input (0 hits in
  40 runs), but the subagents could see the repository's instructions file. See `harness/agents/README.md`.
- **Docker network pools.** Docker's default address pools allow about 30 episode networks at once, so finish
  sessions as they complete, or widen `default-address-pools` in the daemon config.

## Next step: bring the bench to the level of strong human QA (no paid testers yet)
The B0 runs showed every agent, and the scripted suite, finding every planted defect. So recall no longer separates
systems, and the planted bugs are easier than real ones. These steps, in order, close the gap without paid testers:
1. **Exploratory briefs.** Add a goal-only brief mode, with no journeys or checklist, scored as its own track
   variant. Regression briefs measure following a plan; exploratory ones measure finding problems.
2. **Expert test charters per app.** Write down what a senior tester would cover, using:
   - boundary values and equivalence classes;
   - error guessing;
   - a role and permission matrix;
   - state transitions;
   - cross-page consistency.

   Coverage of the charters becomes a metric, standing in for human-like thoroughness. Charters are public; the
   labels stay sealed.
3. **Harder, realistic defects.** In order:
   - several defects per episode;
   - bugs that show only for some data, roles or sequences (rounding, timezones, a stale cache after edits, two
     tabs);
   - cross-page mismatches;
   - fewer of Swag Labs' publicly documented faults (the models may know them);
   - then Conduit and ParaBank (B1) with new mutations.
4. **Keep triaging.**
   - After every run, reproduce the unmatched findings on the clean build. Each real one becomes a `natural` label
     with a `description_pattern` and a `verify.ts` check.
   - Fix bugs that the bench itself introduced, such as unknown URLs returning a blank 200 page from our nginx
     fallback.
5. **Repeats and confidence intervals.** Run each configuration three or more times on fixed sets, and report the
   mean and spread.
6. **Report quality** (BRIEF §9). A fixed agent replays each true finding's repro steps on a fresh instance of the
   episode, and the share that reproduce is the score.
7. **Tighter agent sealing:**
   - a `qa-tester` agent definition with only browser and file tools, so subagents can't call messaging or docs
     tools;
   - then a container driver with a model API key, so agents never see the repository.
8. **Then B1 breadth** (BRIEF §12):
   - the survey site in the noise track;
   - expense-app visual, a11y and usability mutations;
   - Mailpit and Keycloak, then Ghost (track 7.6);
   - the WebTestBench import (7.2);
   - the held-out split (BD3).

## Watch out for
- **The noise track is the only part that touches live sites.** Keep their rules in the track file, and never run
  them in CI.
- **Changes to ground truth need evidence** (AGENTS.md rule 9). Confirm the behaviour in the app, add a `verify.ts`
  check, then re-score. Never widen a label to fit one system's findings.
- **Building an adapter:** don't read labels, episodes or `verify.ts`. The `playwright-suite` adapter was built
  that way, from app behaviour and public source only.
- **Briefs ask; they don't change state.** The bench gives systems briefs and goals. It must never ask a system
  to promote what it learned into approved checks (`promote: false` in the `http-api` request).
